from backend.services.gemini_service import (
    generate_mock_analysis,
    analyze_document_with_gemini,
    answer_question_with_gemini
)

def test_generate_mock_analysis(sample_contract_text):
    mock = generate_mock_analysis(sample_contract_text)
    
    assert "summary" in mock
    assert "clauses" in mock
    assert "disclaimer" in mock
    assert mock["summary"]["document_type"] == "Non-Disclosure Agreement (NDA)"
    assert len(mock["clauses"]) > 0
    assert mock["summary"]["overall_risk_score"] in ["low", "medium", "high"]

def test_answer_question_with_gemini_mock(sample_contract_text):
    question = "Can I terminate this agreement early?"
    result = answer_question_with_gemini(question, sample_contract_text)
    
    assert result["question"] == question
    assert "answer" in result
    assert len(result["lawyer_followups"]) > 0
    assert "disclaimer" in result
