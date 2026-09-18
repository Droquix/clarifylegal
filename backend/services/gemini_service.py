import json
import logging
import time
from typing import Dict, Any, Optional
from google import genai
from google.genai import types

from backend.config import settings
from backend.services.disclaimer_service import apply_disclaimer_guardrails, MANDATORY_DISCLAIMER

logger = logging.getLogger("clarifylegal.gemini")

SYSTEM_PROMPT = """
You are ClarifyLegal AI, an assistant that translates legal documents into clear, plain English for non-lawyers.

STRICT MANDATORY RULES FOR YOUR OUTPUT:
1. You are NOT a lawyer and DO NOT give legal advice.
2. Frame EVERY single explanation informationally (e.g., "This clause typically means...", "In standard practice, this provision usually implies...", "You may want to ask a lawyer whether...").
3. NEVER instruct or advise the user to act or refrain from acting (NEVER say "You should sign", "You must refuse", "Do not agree").
4. Identify key deadlines, financial terms, parties involved, governing law, and potential red flags.
5. Provide specific, practical questions the user can ask a licensed attorney about this contract.
6. Output ONLY a valid JSON object matching the requested schema. Do NOT include markdown code blocks or text outside JSON.
"""

def generate_mock_analysis(document_text: str) -> Dict[str, Any]:
    """
    Generates an intelligent mock legal document breakdown when Gemini API key is not present.
    Allows local development, offline usage, and seamless testing.
    """
    word_count = len(document_text.split())
    doc_lower = document_text.lower()

    doc_type = "Legal Agreement"
    if "non-disclosure" in doc_lower or "confidential" in doc_lower or "nda" in doc_lower:
        doc_type = "Non-Disclosure Agreement (NDA)"
    elif "lease" in doc_lower or "tenant" in doc_lower or "landlord" in doc_lower:
        doc_type = "Residential / Commercial Lease Agreement"
    elif "employment" in doc_lower or "employee" in doc_lower or "employer" in doc_lower:
        doc_type = "Employment Contract"
    elif "service" in doc_lower or "contractor" in doc_lower or "client" in doc_lower:
        doc_type = "Services Agreement / Independent Contractor Contract"

    has_indemnity = "indemnify" in doc_lower or "hold harmless" in doc_lower
    has_noncompete = "non-compete" in doc_lower or "solicit" in doc_lower
    has_termination = "terminate" in doc_lower or "cancellation" in doc_lower or "notice" in doc_lower

    overall_risk = "medium"
    if has_indemnity or has_noncompete:
        overall_risk = "high"

    clauses = [
        {
            "id": "clause-1",
            "title": "Confidentiality & Non-Disclosure Scope",
            "category": "obligations_and_liabilities",
            "risk_level": "medium",
            "original_text": "Recipient agrees to hold and maintain in strict confidence all Confidential Information supplied by Disclosing Party and shall not disclose such information to any third party without prior written consent.",
            "plain_english": "This clause typically means you are legally obligated to keep all shared business secrets and internal documents private.",
            "potential_impact": "Disclosing protected information, even accidentally, could potentially trigger breach of contract allegations or monetary damages.",
            "lawyer_questions": [
                "Does this confidentiality obligation have a specific expiration date?",
                "What specific items are excluded from the definition of confidential information?"
            ]
        },
        {
            "id": "clause-2",
            "title": "Indemnification & Legal Expense Liability",
            "category": "red_flags",
            "risk_level": "high" if has_indemnity else "medium",
            "original_text": "Party agrees to defend, indemnify, and hold harmless the Company from and against any claims, liabilities, losses, damages, and reasonable attorney's fees arising out of any breach.",
            "plain_english": "This provision usually implies that if a third party sues the company due to your work or actions, you may be expected to pay their legal fees and settlement costs.",
            "potential_impact": "Indemnity clauses can create significant financial exposure if legal disputes arise.",
            "lawyer_questions": [
                "Can we add a financial cap to my indemnity liability?",
                "Can we limit indemnification strictly to claims resulting from gross negligence or intentional misconduct?"
            ]
        },
        {
            "id": "clause-3",
            "title": "Termination & Notice Period",
            "category": "termination_and_renewal",
            "risk_level": "low" if has_termination else "medium",
            "original_text": "Either party may terminate this Agreement at any time upon providing thirty (30) days prior written notice to the other party.",
            "plain_english": "This clause typically means either side can cancel the contract as long as they give 30 days written notice in advance.",
            "potential_impact": "Ensures flexibility to end the agreement, but requires planning for a 30-day transition period.",
            "lawyer_questions": [
                "What method of written notice is required (e.g. certified mail vs. email)?",
                "What happens to outstanding work or payments during the 30-day notice period?"
            ]
        },
        {
            "id": "clause-4",
            "title": "Governing Law & Dispute Resolution",
            "category": "standard_and_boilerplate",
            "risk_level": "low",
            "original_text": "This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law principles.",
            "plain_english": "This clause designates Delaware state law as the legal standard used to interpret this document if a disagreement arises.",
            "potential_impact": "If a legal dispute occurs, court proceedings would generally take place under Delaware legal jurisdiction.",
            "lawyer_questions": [
                "Is Delaware a convenient jurisdiction if formal arbitration or court filings become necessary?"
            ]
        }
    ]

    return apply_disclaimer_guardrails({
        "summary": {
            "document_type": doc_type,
            "executive_summary": (
                f"This document appears to be a {doc_type}. It defines the primary legal relationship, "
                "confidentiality duties, termination rules, and liability allocations between the participating parties."
            ),
            "overall_risk_score": overall_risk,
            "risk_rationale": (
                "Assessed based on indemnity commitments, non-disclosure obligations, and potential liability provisions."
            ),
            "word_count": word_count,
            "metadata": {
                "effective_date": "Upon signing / As stated in Section 1",
                "governing_law": "State of Delaware (or as specified in jurisdiction section)",
                "parties_involved": ["Disclosing Party / Company", "Receiving Party / Contractor"],
                "key_deadlines": ["30-day written termination notice requirement"],
                "financial_terms": ["Payment due within 30 days of invoice receipt (if applicable)"]
            }
        },
        "clauses": clauses,
        "disclaimer": MANDATORY_DISCLAIMER
    })


def analyze_document_with_gemini(document_text: str) -> Dict[str, Any]:
    """
    Calls the Gemini 2.0 Flash API to perform structured legal text simplification.
    Falls back to mock analysis if GEMINI_API_KEY is not configured or if API fails.
    """
    if not settings.GEMINI_API_KEY:
        logger.info("GEMINI_API_KEY not configured. Utilizing intelligent mock analysis mode.")
        return generate_mock_analysis(document_text)

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        prompt = f"""
{SYSTEM_PROMPT}

DOCUMENT CONTENT TO ANALYZE:
---
{document_text[:30000]}
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
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
            )
        )

        response_text = response.text.strip()
        data = json.loads(response_text)
        return apply_disclaimer_guardrails(data)

    except Exception as e:
        logger.warning(f"Gemini API call encountered an error ({str(e)}). Falling back to mock analysis.")
        return generate_mock_analysis(document_text)


def answer_question_with_gemini(question: str, document_text: str) -> Dict[str, Any]:
    """
    Answers user questions about an uploaded legal document in plain English.
    """
    if not settings.GEMINI_API_KEY:
        return {
            "question": question,
            "answer": (
                f"Based on the provided document text, this agreement typically addresses questions like '{question}' "
                "within its general terms. For specific legal interpretation, consider asking an attorney."
            ),
            "lawyer_followups": [
                f"How does the contract specifically enforce provisions related to: {question}?",
                "Are there any external statutory rights that override this clause in my state?"
            ],
            "disclaimer": MANDATORY_DISCLAIMER
        }

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        prompt = f"""
{SYSTEM_PROMPT}

DOCUMENT CONTEXT:
---
{document_text[:20000]}
---

USER QUESTION: {question}

Please answer the user's question accurately using ONLY information found in or implied by the document.
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
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.3,
            )
        )

        data = json.loads(response.text.strip())
        return {
            "question": question,
            "answer": apply_disclaimer_guardrails({"summary": {"executive_summary": data.get("answer", "")}})["summary"]["executive_summary"],
            "lawyer_followups": data.get("lawyer_followups", []),
            "disclaimer": MANDATORY_DISCLAIMER
        }
    except Exception as e:
        logger.warning(f"QA Gemini call failed: {str(e)}")
        return {
            "question": question,
            "answer": (
                f"Regarding your question ('{question}'), legal documents usually define governing rights in dedicated sections. "
                "You may want to ask a lawyer to review the exact phrasing in your document."
            ),
            "lawyer_followups": [
                f"Does this contract impose specific limits regarding {question}?",
                "What remedies exist if a dispute arises regarding this term?"
            ],
            "disclaimer": MANDATORY_DISCLAIMER
        }
