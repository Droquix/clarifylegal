import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException

from backend.services.gemini_service import (
    analyze_document_with_gemini,
    answer_question_with_gemini
)

def test_analyze_document_without_provider_key_raises_clear_error(sample_contract_text):
    with patch("backend.services.gemini_service.settings.GEMINI_API_KEY", ""):
        with pytest.raises(HTTPException) as exc_info:
            analyze_document_with_gemini(sample_contract_text)
    assert exc_info.value.status_code == 503
    assert "Document analysis is unavailable" in exc_info.value.detail

def test_answer_question_with_gemini_missing_key_raises_error(sample_contract_text):
    with patch("backend.services.gemini_service.settings.GEMINI_API_KEY", ""):
        with pytest.raises(HTTPException) as exc_info:
            answer_question_with_gemini("What is the rent?", sample_contract_text)
        assert exc_info.value.status_code == 503
        assert "API key is missing" in exc_info.value.detail

def test_answer_question_with_gemini_api_error_raises_clear_user_message(sample_contract_text):
    with patch("backend.services.gemini_service.settings.GEMINI_API_KEY", "fake_key"):
        with patch("google.genai.Client") as mock_client:
            mock_client.return_value.models.generate_content.side_effect = Exception("API Quota Exceeded")

            with pytest.raises(HTTPException) as exc_info:
                answer_question_with_gemini("What is the penalty?", sample_contract_text)

            assert exc_info.value.status_code == 502
            assert "Sorry, document Q&A encountered an error" in exc_info.value.detail

def test_answer_question_with_gemini_returns_specific_document_content():
    specific_doc = "APARTMENT LEASE CONTRACT. Monthly rent is $4,250 payable on the 1st of each month to Landlord Acme Corp."
    question = "What is the monthly rent amount?"

    mock_gemini_json = '{"answer": "The monthly rent is $4,250.", "lawyer_followups": ["Is there a grace period for rent payments?"], "citations": ["Monthly rent is $4,250 payable on the 1st of each month to Landlord Acme Corp."]}'

    with patch("backend.services.gemini_service.settings.GEMINI_API_KEY", "valid_test_key"):
        with patch("google.genai.Client") as mock_client:
            mock_response = MagicMock()
            mock_response.text = mock_gemini_json
            mock_client.return_value.models.generate_content.return_value = mock_response

            result = answer_question_with_gemini(question, specific_doc)

            assert result["question"] == question
            assert "$4,250" in result["answer"]
            assert "typically addresses questions like" not in result["answer"]
            assert len(result["lawyer_followups"]) == 1
            assert len(result["citations"]) == 1

def test_extract_json_from_text_repairs_truncated_json():
    from backend.services.gemini_service import extract_json_from_text
    truncated_raw = '{ "summary": { "overview": "The revised contract introduces significant changes to the original agreement, including a non-compete clause, indemnification, and extended notice period for termination. These changes may increase the obligations and liabilities of the parties invo'
    parsed = extract_json_from_text(truncated_raw)
    assert isinstance(parsed, dict)
    assert "summary" in parsed
    assert "The revised contract" in parsed["summary"]["overview"]

