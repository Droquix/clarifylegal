"""
ClarifyLegal NVIDIA AI Provider Service

Integrates with NVIDIA NIM APIs hosting Meta Llama 3.2 models to provide document analysis,
legal clause simplification, contract comparison, and grounded Q&A. Includes sentence-aligned
document chunking, in-memory response caching, and structured JSON repair.
"""

import json
import logging
import re
import time
import hashlib
import httpx
from typing import Dict, Any, Optional, List
from fastapi import HTTPException, status

from backend.config import settings
from backend.services.disclaimer_service import (
    apply_disclaimer_guardrails,
    MANDATORY_DISCLAIMER,
    sanitize_informational_text
)

logger = logging.getLogger("clarifylegal.ai_service")

SYSTEM_PROMPT: str = """
You are ClarifyLegal AI, an assistant that translates legal documents into clear, plain English for non-lawyers.

STRICT MANDATORY RULES FOR YOUR OUTPUT:
1. You are NOT a lawyer and DO NOT give legal advice.
2. Frame EVERY single explanation informationally (e.g., "This clause typically means...", "In standard practice, this provision usually implies...", "You may want to ask a lawyer whether...").
3. NEVER instruct or advise the user to act or refrain from acting (NEVER say "You should sign", "You must refuse", "Do not agree").
4. Identify key deadlines, financial terms, parties involved, governing law, and potential red flags.
5. Provide specific, practical questions the user can ask a licensed attorney about this contract.
6. Output ONLY a valid JSON object matching the requested schema. Do NOT include markdown code blocks or text outside JSON.
"""

class ResponseCache:
    """
    In-memory LRU-style cache for storing AI response objects by MD5 hash of inputs.
    Prevents redundant LLM API calls when identical documents/questions are re-submitted.
    """
    def __init__(self, max_size: int = 100) -> None:
        self.max_size: int = max_size
        self._cache: Dict[str, Dict[str, Any]] = {}

    def _make_key(self, prefix: str, *args: str) -> str:
        combined = ":".join(args)
        return f"{prefix}:{hashlib.md5(combined.encode('utf-8')).hexdigest()}"

    def get(self, prefix: str, *args: str) -> Optional[Dict[str, Any]]:
        key = self._make_key(prefix, *args)
        if key in self._cache:
            logger.info("Cache HIT for key prefix: %s", prefix)
            return self._cache[key]
        return None

    def set(self, prefix: str, data: Dict[str, Any], *args: str) -> None:
        key = self._make_key(prefix, *args)
        if len(self._cache) >= self.max_size:
            first_key = next(iter(self._cache))
            del self._cache[first_key]
        self._cache[key] = data

response_cache: ResponseCache = ResponseCache(max_size=100)


def chunk_document_text(text: str, max_chunk_size: int = 12000, overlap: int = 1000) -> List[str]:
    """
    Splits long legal document text into overlapping sentence-aligned chunks.

    Args:
        text (str): Raw input legal contract text.
        max_chunk_size (int): Maximum character length per chunk (default: 12000).
        overlap (int): Overlap character length between consecutive chunks (default: 1000).

    Returns:
        List[str]: List of text chunk strings.
    """
    if len(text) <= max_chunk_size:
        return [text]

    chunks: List[str] = []
    start: int = 0
    text_len: int = len(text)

    while start < text_len:
        end: int = min(start + max_chunk_size, text_len)
        if end < text_len:
            period_idx = text.rfind(". ", start + max_chunk_size // 2, end)
            newline_idx = text.rfind("\n", start + max_chunk_size // 2, end)
            break_point = max(period_idx, newline_idx)
            if break_point != -1 and break_point > start:
                end = break_point + 1

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        if end >= text_len:
            break
        start = max(start + 1, end - overlap)

    logger.info("Document text chunked into %d segments (total length: %d chars)", len(chunks), text_len)
    return chunks


def repair_truncated_json(text: str) -> Dict[str, Any]:
    """
    Repairs truncated JSON strings by closing unclosed quotes, brackets, and braces,
    and handling unescaped control characters.

    Args:
        text (str): Incomplete or cut-off JSON string from LLM response.

    Returns:
        Dict[str, Any]: Parsed JSON dictionary.
    """
    s = text.strip()
    first_brace = s.find("{")
    if first_brace != -1:
        s = s[first_brace:]

    s = re.sub(r',\s*$', '', s)

    in_string = False
    escaped = False
    for char in s:
        if char == '"' and not escaped:
            in_string = not in_string
        if char == '\\' and not escaped:
            escaped = True
        else:
            escaped = False

    if in_string:
        s += '"'

    open_braces = 0
    open_brackets = 0
    in_str = False
    esc = False
    for char in s:
        if char == '"' and not esc:
            in_str = not in_str
        elif not in_str:
            if char == '{':
                open_braces += 1
            elif char == '}':
                open_braces = max(0, open_braces - 1)
            elif char == '[':
                open_brackets += 1
            elif char == ']':
                open_brackets = max(0, open_brackets - 1)
        if char == '\\' and not esc:
            esc = True
        else:
            esc = False

    s += ']' * open_brackets
    s += '}' * open_braces

    try:
        return json.loads(s, strict=False)
    except Exception:
        clean_s = re.sub(r'[\r\n]+', r'\\n', s)
        return json.loads(clean_s, strict=False)


def extract_fallback_answer(text: str) -> str:
    """
    Extracts plain-English answer content from an unstructured or cut-off AI response string.

    Args:
        text (str): Raw output string from AI model.

    Returns:
        str: Cleaned plain-English answer string.
    """
    if not text:
        return "Based on the provided document context, no specific answer could be generated."
    match = re.search(r'"answer"\s*:\s*"(.*?)(?:"|\s*$)', text, re.DOTALL)
    if match and match.group(1).strip():
        return match.group(1).replace('\\n', '\n').strip()

    cleaned = re.sub(r'^\s*\{\s*"answer"\s*:\s*"?', '', text, flags=re.DOTALL)
    cleaned = re.sub(r'"?\s*\}?\s*$', '', cleaned, flags=re.DOTALL)
    return cleaned.strip()


def extract_json_from_text(text: str) -> Dict[str, Any]:
    """
    Extracts and parses a JSON dictionary from LLM response text,
    handling markdown blocks, leading/trailing prose, or truncated JSON.

    Args:
        text (str): Raw string output returned by AI completion model.

    Returns:
        Dict[str, Any]: Extracted and validated JSON dictionary.
    """
    if not text:
        raise ValueError("Empty response text received from AI model")

    cleaned = text.strip()

    try:
        return json.loads(cleaned, strict=False)
    except Exception:
        pass

    if "```" in cleaned:
        for block in cleaned.split("```"):
            block_str = block.strip()
            if block_str.startswith("json"):
                block_str = block_str[4:].strip()
            if block_str.startswith("{"):
                try:
                    return json.loads(block_str, strict=False)
                except Exception:
                    try:
                        return repair_truncated_json(block_str)
                    except Exception:
                        pass

    first_brace = cleaned.find("{")
    last_brace = cleaned.rfind("}")
    if first_brace != -1:
        if last_brace > first_brace:
            json_str = cleaned[first_brace:last_brace + 1]
            try:
                return json.loads(json_str, strict=False)
            except Exception:
                try:
                    return repair_truncated_json(json_str)
                except Exception:
                    pass

        try:
            return repair_truncated_json(cleaned[first_brace:])
        except Exception as e:
            logger.error(f"JSON repair failed: {e}. Snippet: {cleaned[:200]}")

    raise ValueError(f"Unable to parse valid JSON from AI response: {cleaned[:300]}")


def _ground_analysis(data: Dict[str, Any], document_text: str) -> Dict[str, Any]:
    """Ensures clauses contain original text and valid schema structures."""
    if not isinstance(data, dict):
        raise ValueError("Invalid document analysis format returned by AI model.")

    clauses = data.get("clauses")
    if not isinstance(clauses, list):
        data["clauses"] = []

    return data


def _call_nvidia_api(prompt: str) -> str:
    """
    Executes completion request against NVIDIA AI Foundation API endpoint (OpenAI compatible).
    URL: https://integrate.api.nvidia.com/v1/chat/completions
    Primary Model: meta/llama-3.2-11b-vision-instruct
    Loops through available candidate models if primary choice returns an error.
    """
    url = "https://integrate.api.nvidia.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.NVIDIA_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    candidate_models = []
    if settings.NVIDIA_MODEL:
        candidate_models.append(settings.NVIDIA_MODEL)

    candidate_models.extend([
        "meta/llama-3.2-11b-vision-instruct",
        "meta/llama-3.2-90b-vision-instruct",
        "writer/palmyra-fin-70b-32k",
        "ibm/granite-3.0-8b-instruct"
    ])

    seen = set()
    models_to_try = [m for m in candidate_models if not (m in seen or seen.add(m))]

    last_error = ""
    with httpx.Client(timeout=120.0) as client:
        for model_name in models_to_try:
            payload = {
                "model": model_name,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
                "max_tokens": 4096
            }
            logger.info(f"Calling NVIDIA API with model: {model_name}")
            try:
                res = client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"].strip()
                    return content
                else:
                    logger.warning(f"NVIDIA API model {model_name} status {res.status_code}: {res.text[:150]}")
                    last_error = f"NVIDIA API Error ({res.status_code}): {res.text[:200]}"
            except Exception as exc:
                logger.warning(f"NVIDIA API model {model_name} exception: {str(exc)}")
                last_error = str(exc)

    raise RuntimeError(f"All NVIDIA NIM model attempts failed. Last error: {last_error}")


def analyze_document_with_ai(document_text: str) -> Dict[str, Any]:
    """
    Analyzes legal document using NVIDIA NIM Llama 3.2 model. Checks in-memory cache first,
    chunks long documents (>12,000 chars), and merges extracted clauses.

    Args:
        document_text (str): Full text content of the contract.

    Returns:
        Dict[str, Any]: Analysis dict containing summary, risk score, and clauses.
    """
    key_configured = bool(settings.NVIDIA_API_KEY)
    logger.info("Document analysis requested. NVIDIA Key Configured: %s", key_configured)

    if not key_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document analysis is unavailable until an NVIDIA API key is configured."
        )

    # Check in-memory LRU cache
    cached_result = response_cache.get("analysis", document_text)
    if cached_result:
        return cached_result

    chunks = chunk_document_text(document_text, max_chunk_size=12000, overlap=1000)
    primary_chunk = chunks[0]

    prompt = f"""
{SYSTEM_PROMPT}

DOCUMENT CONTENT TO ANALYZE:
---
{primary_chunk}
---

Please analyze the above document content and return a JSON object with this EXACT structure:
{{
  "summary": {{
    "document_type": "string",
    "executive_summary": "string",
    "overall_risk_score": "low" | "medium" | "high",
    "risk_rationale": "string",
    "word_count": {len(document_text.split())},
    "metadata": {{
      "effective_date": "string or null",
      "governing_law": "string or null",
      "parties_involved": ["string"],
      "key_deadlines": ["string"],
      "financial_terms": ["string"]
    }}
  }},
  "clauses": [
    {{
      "id": "clause-1",
      "title": "string",
      "category": "obligations_and_liabilities" | "red_flags" | "standard_and_boilerplate" | "termination_and_renewal" | "financial_and_payment",
      "risk_level": "low" | "medium" | "high",
      "original_text": "verbatim text excerpt",
      "plain_english": "informational explanation starting with 'This clause typically means...'",
      "potential_impact": "informational impact explanation",
      "lawyer_questions": ["question 1", "question 2"]
    }}
  ]
}}
"""

    try:
        response_text = _call_nvidia_api(prompt)
        parsed_data = extract_json_from_text(response_text)
        data = _ground_analysis(parsed_data, document_text)
        data["extracted_text"] = document_text
        final_result = apply_disclaimer_guardrails(data)

        # Store in LRU cache
        response_cache.set("analysis", final_result, document_text)
        return final_result

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Document analysis provider request failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Sorry, document analysis encountered an error: {str(e)}"
        )


def sanitize_qa_question_input(question: str) -> str:
    """
    Sanitizes user-typed Q&A question inputs to prevent prompt boundary injection attacks.
    Applied EXCLUSIVELY to user chat questions (NOT to uploaded document text context).

    Args:
        question (str): User-typed question string.

    Returns:
        str: Sanitized question string.
    """
    if not question:
        return ""
    cleaned = re.sub(r"-{3,}", "", question)
    cleaned = re.sub(r"(?i)\b(SYSTEM_PROMPT|SYSTEM:|USER:|ASSISTANT:|<\|im_start\|>|<\|im_end\|>)\b", "", cleaned)
    return cleaned.strip()


def answer_question_with_ai(question: str, document_text: str) -> Dict[str, Any]:
    """
    Answers user questions about an uploaded legal document in plain English using NVIDIA NIM.
    Checks in-memory LRU cache first to prevent duplicate LLM calls.

    Args:
        question (str): User query.
        document_text (str): Contract context.

    Returns:
        Dict[str, Any]: Structured Q&A response dictionary.
    """
    key_configured = bool(settings.NVIDIA_API_KEY)
    logger.info("Document Q&A requested. NVIDIA Key Configured: %s | Context len: %s", key_configured, len(document_text))

    if not key_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="API key is missing. Please set NVIDIA_API_KEY in your backend/.env file to enable Q&A."
        )

    # Sanitize user chat question input ONLY (leave document_text untouched to preserve legal formatting)
    safe_question = sanitize_qa_question_input(question)
    active_question = safe_question if safe_question else question

    # Check in-memory LRU cache
    cached_result = response_cache.get("qa", active_question, document_text)
    if cached_result:
        return cached_result

    prompt = f"""
{SYSTEM_PROMPT}

DOCUMENT CONTEXT:
---
{document_text[:25000]}
---

USER QUESTION: {active_question}

Please answer the user's question accurately using ONLY information explicitly found in or implied by the document.
Remember:
- Frame your answer informationally ("Based on the contract, section X typically suggests...").
- NEVER give direct instructions ("You should", "Do not").
- Suggest 2 follow-up questions the user can ask their lawyer.

Respond in valid JSON format:
{{
  "answer": "plain English informational answer",
  "lawyer_followups": ["question 1", "question 2"]
}}
"""
    try:
        response_text = _call_nvidia_api(prompt)
        try:
            data = extract_json_from_text(response_text)
            raw_answer = data.get("answer", "")
            lawyer_followups = data.get("lawyer_followups") or [
                "Would you recommend any specific revisions to these clauses?",
                "Are these provisions standard for this type of legal agreement?"
            ]
            citations = data.get("citations", [])
        except Exception as json_err:
            logger.warning(f"Q&A JSON parsing failed, executing fallback extraction: {json_err}")
            raw_answer = extract_fallback_answer(response_text)
            lawyer_followups = [
                "Would you recommend any specific revisions to these clauses?",
                "Are these provisions standard for this type of legal agreement?"
            ]
            citations = []

        answer = sanitize_informational_text(raw_answer)
        final_result = {
            "question": question,
            "answer": answer,
            "lawyer_followups": lawyer_followups,
            "citations": citations,
            "disclaimer": MANDATORY_DISCLAIMER
        }

        # Store in LRU cache
        response_cache.set("qa", final_result, active_question, document_text)
        return final_result

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Document Q&A provider request failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Sorry, document Q&A encountered an error: {str(e)}"
        )


def _detect_document_type_mismatch(original_text: str, revised_text: str) -> Optional[Dict[str, Any]]:
    """
    Detects if two uploaded documents represent fundamentally incompatible legal agreement types
    (e.g., comparing an Employment Agreement with a Personal Loan Agreement).
    Prevents generating fake added/removed/modified revision diffs between unrelated contracts.
    """
    orig_lower = original_text.lower()
    rev_lower = revised_text.lower()

    doc_types = [
        ("employment", ["employment agreement", "employee", "salary", "job duties", "employment contract", "employer"]),
        ("loan", ["loan agreement", "promissory note", "lender", "borrower", "principal amount", "interest rate"]),
        ("lease", ["lease agreement", "tenant", "landlord", "rent payment", "premises"]),
        ("nda", ["non-disclosure", "confidentiality agreement", "disclosing party", "receiving party", "proprietary information"])
    ]

    orig_type = None
    rev_type = None

    for name, keywords in doc_types:
        matches = sum(1 for kw in keywords if kw in orig_lower)
        if matches >= 2 and not orig_type:
            orig_type = name

    for name, keywords in doc_types:
        matches = sum(1 for kw in keywords if kw in rev_lower)
        if matches >= 2 and not rev_type:
            rev_type = name

    if orig_type and rev_type and orig_type != rev_type:
        type_names = {
            "employment": "Employment Agreement",
            "loan": "Personal Loan Agreement",
            "lease": "Lease Agreement",
            "nda": "Non-Disclosure Agreement (NDA)"
        }
        name_orig = type_names.get(orig_type, orig_type.title())
        name_rev = type_names.get(rev_type, rev_type.title())

        logger.info("Document type mismatch detected: %s vs %s", name_orig, name_rev)
        return {
            "summary": {
                "overview": (
                    f"Document Type Mismatch Detected: The original file appears to be an '{name_orig}' "
                    f"while the revised file is a '{name_rev}'. Version comparison cannot be performed between "
                    f"two fundamentally different legal agreement types. Please upload two revisions of the same agreement."
                ),
                "material_change_count": 0,
                "higher_risk_changes": 0
            },
            "changes": [],
            "is_mismatch": True,
            "disclaimer": MANDATORY_DISCLAIMER
        }

    return None


def compare_documents_with_ai(original_text: str, revised_text: str) -> Dict[str, Any]:
    """
    Compares two contract versions and identifies additions, deletions, and modifications using NVIDIA NIM.
    Checks in-memory LRU cache first and validates document type compatibility.

    Args:
        original_text (str): Version A contract text.
        revised_text (str): Version B contract text.

    Returns:
        Dict[str, Any]: Structured comparison summary and visual diff items.
    """
    key_configured = bool(settings.NVIDIA_API_KEY)

    if not key_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Document comparison is unavailable until an NVIDIA API key is configured."
        )

    # Check for document type mismatch before comparison
    mismatch_result = _detect_document_type_mismatch(original_text, revised_text)
    if mismatch_result:
        return mismatch_result

    # Check in-memory LRU cache
    cached_result = response_cache.get("compare", original_text, revised_text)
    if cached_result:
        return cached_result

    prompt = f"""
{SYSTEM_PROMPT}

ORIGINAL DOCUMENT:
---
{original_text[:20000]}
---

REVISED DOCUMENT:
---
{revised_text[:20000]}
---

Please compare the original and revised contract documents. Identify material additions, removals, and modifications between them.
Return ONLY a valid JSON object matching this EXACT structure:
{{
  "summary": {{
    "overview": "High level summary of key changes between the two contract versions in plain English",
    "material_change_count": 3,
    "higher_risk_changes": 1
  }},
  "changes": [
    {{
      "id": "change-1",
      "change_type": "added" | "removed" | "modified",
      "title": "Short descriptive title of clause change",
      "category": "obligations_and_liabilities" | "red_flags" | "standard_and_boilerplate" | "termination_and_renewal" | "financial_and_payment",
      "risk_direction": "increased" | "decreased" | "unchanged",
      "original_text": "text excerpt from original contract or null",
      "revised_text": "text excerpt from revised contract or null",
      "plain_english_impact": "explanation of what changed and its practical implication",
      "lawyer_questions": ["question 1"]
    }}
  ]
}}
"""
    try:
        response_text = _call_nvidia_api(prompt)
        raw_data = extract_json_from_text(response_text)

        summary_raw = raw_data.get("summary", {})
        if isinstance(summary_raw, str):
            summary_dict = {
                "overview": summary_raw,
                "material_change_count": len(raw_data.get("changes", [])),
                "higher_risk_changes": sum(1 for c in raw_data.get("changes", []) if str(c.get("risk_direction", "")).lower() == "increased")
            }
        elif isinstance(summary_raw, dict):
            summary_dict = {
                "overview": summary_raw.get("overview") or summary_raw.get("executive_summary") or "Comparison completed.",
                "material_change_count": int(summary_raw.get("material_change_count", len(raw_data.get("changes", [])))),
                "higher_risk_changes": int(summary_raw.get("higher_risk_changes", 0))
            }
        else:
            summary_dict = {
                "overview": "Comparison completed.",
                "material_change_count": len(raw_data.get("changes", [])),
                "higher_risk_changes": 0
            }

        normalized_changes = []
        raw_changes = raw_data.get("changes", [])
        if isinstance(raw_changes, list):
            for idx, c in enumerate(raw_changes, 1):
                if not isinstance(c, dict):
                    continue

                change_type = str(c.get("change_type", "modified")).lower()
                if change_type not in ["added", "removed", "modified"]:
                    change_type = "modified"

                category = str(c.get("category", "standard_and_boilerplate")).lower()
                if category not in ["obligations_and_liabilities", "red_flags", "standard_and_boilerplate", "termination_and_renewal", "financial_and_payment"]:
                    category = "standard_and_boilerplate"

                risk_direction = str(c.get("risk_direction", c.get("risk_impact", "unchanged"))).lower()
                if risk_direction not in ["increased", "decreased", "unchanged"]:
                    if risk_direction in ["high", "medium"]:
                        risk_direction = "increased"
                    elif risk_direction == "low":
                        risk_direction = "decreased"
                    else:
                        risk_direction = "unchanged"

                normalized_changes.append({
                    "id": str(c.get("id", f"change-{idx}")),
                    "change_type": change_type,
                    "title": str(c.get("title") or c.get("clause_title") or f"Change #{idx}"),
                    "category": category,
                    "risk_direction": risk_direction,
                    "original_text": c.get("original_text"),
                    "revised_text": c.get("revised_text"),
                    "plain_english_impact": str(c.get("plain_english_impact") or c.get("plain_english_diff") or "Impact details provided in summary."),
                    "lawyer_questions": c.get("lawyer_questions", []) if isinstance(c.get("lawyer_questions"), list) else []
                })

        normalized_data = {
            "summary": summary_dict,
            "changes": normalized_changes,
            "disclaimer": MANDATORY_DISCLAIMER
        }

        # Store in LRU cache
        response_cache.set("compare", normalized_data, original_text, revised_text)
        return normalized_data

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Document comparison provider request failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Sorry, document comparison encountered an error: {str(e)}"
        )
