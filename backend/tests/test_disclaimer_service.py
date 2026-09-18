from backend.services.disclaimer_service import (
    sanitize_informational_text,
    apply_disclaimer_guardrails,
    MANDATORY_DISCLAIMER
)

def test_sanitize_informational_text_replaces_direct_advice():
    text_with_advice = "You should sign this agreement immediately, or refuse this if you dislike it."
    sanitized = sanitize_informational_text(text_with_advice)
    
    assert "you should sign" not in sanitized.lower()
    assert "refuse this" not in sanitized.lower()
    assert "consider reviewing" in sanitized.lower() or "typically contains" in sanitized.lower()

def test_apply_disclaimer_guardrails_adds_mandatory_disclaimer():
    sample_response = {
        "summary": {
            "executive_summary": "You should sign this NDA contract.",
            "risk_rationale": "High risk."
        },
        "clauses": [
            {
                "plain_english": "I advise you to consult legal before signing.",
                "potential_impact": "You must sign."
            }
        ]
    }
    
    guarded = apply_disclaimer_guardrails(sample_response)
    
    assert guarded["disclaimer"] == MANDATORY_DISCLAIMER
    assert "you should sign" not in guarded["summary"]["executive_summary"].lower()
    assert "you must sign" not in guarded["clauses"][0]["potential_impact"].lower()
