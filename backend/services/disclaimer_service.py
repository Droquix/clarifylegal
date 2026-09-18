import re

MANDATORY_DISCLAIMER = (
    "ClarifyLegal provides informational document summaries and explanations only. "
    "This output does NOT constitute legal advice or formal legal representation. "
    "Consult a licensed attorney for binding legal counsel regarding your specific document."
)

ADVICE_PATTERNS = [
    (r"\byou should sign\b", "you may want to consider reviewing this clause with a lawyer before signing"),
    (r"\byou must sign\b", "it is advisable to consult legal counsel before executing"),
    (r"\brefuse this\b", "this clause typically contains strict terms that you may want to negotiate"),
    (r"\bdo not sign\b", "you may wish to seek advice from an attorney prior to signing"),
    (r"\bthis is illegal\b", "this provision may raise legal questions worth discussing with an attorney"),
    (r"\bI advise you to\b", "it is commonly recommended to"),
]

def sanitize_informational_text(text: str) -> str:
    """
    Enforces informational framing rules on AI generated explanations,
    replacing direct legal advice or commands with informational alternatives.
    """
    if not text:
        return ""

    sanitized = text
    for pattern, replacement in ADVICE_PATTERNS:
        sanitized = re.sub(pattern, replacement, sanitized, flags=re.IGNORECASE)

    return sanitized

def apply_disclaimer_guardrails(response_dict: dict) -> dict:
    """
    Applies disclaimer guardrails recursively across all string fields in an analysis response.
    """
    if "summary" in response_dict and isinstance(response_dict["summary"], dict):
        exec_sum = response_dict["summary"].get("executive_summary", "")
        response_dict["summary"]["executive_summary"] = sanitize_informational_text(exec_sum)
        
        rationale = response_dict["summary"].get("risk_rationale", "")
        response_dict["summary"]["risk_rationale"] = sanitize_informational_text(rationale)

    if "clauses" in response_dict and isinstance(response_dict["clauses"], list):
        for clause in response_dict["clauses"]:
            if isinstance(clause, dict):
                clause["plain_english"] = sanitize_informational_text(clause.get("plain_english", ""))
                clause["potential_impact"] = sanitize_informational_text(clause.get("potential_impact", ""))

    response_dict["disclaimer"] = MANDATORY_DISCLAIMER
    return response_dict
