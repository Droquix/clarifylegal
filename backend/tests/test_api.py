import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.pdf_service import sanitize_and_clean_text


def analysis_response(document_text):
    return {
        "summary": {
            "document_type": "Non-Disclosure Agreement (NDA)",
            "executive_summary": "This document typically creates confidentiality obligations.",
            "overall_risk_score": "medium",
            "risk_rationale": "Based on the stated confidentiality obligations.",
            "word_count": len(document_text.split()),
            "metadata": {}
        },
        "clauses": [],
        "extracted_text": document_text,
        "disclaimer": "Informational only."
    }

client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "healthy"
    assert "processing_notice" in json_data

def test_analyze_text_endpoint_success(sample_contract_text):
    mock_analysis = analysis_response(sample_contract_text)
    with patch("backend.main.analyze_document_with_gemini", return_value=mock_analysis):
        response = client.post(
            "/api/analyze-text",
            json={"text": sample_contract_text}
        )
        assert response.status_code == 200
        json_data = response.json()
        assert "summary" in json_data
        assert "clauses" in json_data
        assert "extracted_text" in json_data
        assert json_data["extracted_text"] == sanitize_and_clean_text(sample_contract_text)
        assert "disclaimer" in json_data
        assert json_data["processing_time_seconds"] >= 0

def test_analyze_text_endpoint_too_short():
    response = client.post(
        "/api/analyze-text",
        json={"text": "too short"}
    )
    assert response.status_code == 422 or response.status_code == 400

def test_analyze_text_endpoint_rejects_over_limit_payload():
    response = client.post("/api/analyze-text", json={"text": "a" * 30001})
    assert response.status_code == 422

def test_qa_endpoint_with_mock_gemini(sample_contract_text):
    mock_gemini_json = '{"answer": "The termination notice period is 30 days.", "lawyer_followups": ["Is notice required via registered mail?"], "citations": ["Either party may terminate this Agreement upon providing 30 days written notice."]}'

    with patch("backend.services.gemini_service.settings.GEMINI_API_KEY", "valid_test_key"):
        with patch("google.genai.Client") as mock_client:
            mock_response = MagicMock()
            mock_response.text = mock_gemini_json
            mock_client.return_value.models.generate_content.return_value = mock_response

            response = client.post(
                "/api/qa",
                json={
                    "question": "What is the termination notice period?",
                    "document_text": sample_contract_text
                }
            )
            assert response.status_code == 200
            json_data = response.json()
            assert "30 days" in json_data["answer"]
            assert len(json_data["lawyer_followups"]) == 1
            assert len(json_data["citations"]) == 1
            assert "disclaimer" in json_data

def test_qa_endpoint_missing_api_key(sample_contract_text):
    with patch("backend.services.gemini_service.settings.GEMINI_API_KEY", ""):
        response = client.post(
            "/api/qa",
            json={
                "question": "What is the termination notice period?",
                "document_text": sample_contract_text
            }
        )
        assert response.status_code == 503
        assert "API key is missing" in response.json()["detail"]

def test_analyze_file_endpoint_txt(sample_contract_text):
    mock_analysis = analysis_response(sample_contract_text)
    with patch("backend.main.analyze_document_with_gemini", return_value=mock_analysis):
        response = client.post(
            "/api/analyze-file",
            files={"file": ("contract.txt", sample_contract_text.encode("utf-8"), "text/plain")}
        )
        assert response.status_code == 200
        json_data = response.json()
        assert "summary" in json_data
        assert "clauses" in json_data
        assert "extracted_text" in json_data
        assert json_data["extracted_text"] == sanitize_and_clean_text(sample_contract_text)

def test_analyze_file_invalid_extension():
    response = client.post(
        "/api/analyze-file",
        files={"file": ("contract.exe", b"executable content", "application/octet-stream")}
    )
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]

def test_compare_text_endpoint_success(sample_contract_text):
    mock_comparison = {
        "summary": {
            "overview": "Notice period increased from 30 to 60 days.",
            "material_change_count": 1,
            "higher_risk_changes": 1
        },
        "changes": [
            {
                "id": "change-1",
                "change_type": "modified",
                "title": "Termination Notice",
                "category": "termination_and_renewal",
                "risk_direction": "increased",
                "original_text": "30 days notice",
                "revised_text": "60 days notice",
                "plain_english_impact": "Notice period doubled.",
                "lawyer_questions": ["Is 60 days standard?"]
            }
        ],
        "disclaimer": "Informational comparison only."
    }
    with patch("backend.main.compare_documents_with_gemini", return_value=mock_comparison):
        response = client.post(
            "/api/compare-text",
            json={
                "original_text": sample_contract_text,
                "revised_text": sample_contract_text + "\nNotice is now 60 days."
            }
        )
        assert response.status_code == 200
        json_data = response.json()
        assert "summary" in json_data
        assert "changes" in json_data
        assert json_data["summary"]["material_change_count"] == 1

def test_compare_text_endpoint_too_short():
    response = client.post(
        "/api/compare-text",
        json={
            "original_text": "too short",
            "revised_text": "too short"
        }
    )
    assert response.status_code == 400 or response.status_code == 422

