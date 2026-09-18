import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "healthy"
    assert "privacy_guarantee" in json_data

def test_analyze_text_endpoint_success(sample_contract_text):
    response = client.post(
        "/api/analyze-text",
        json={"text": sample_contract_text}
    )
    assert response.status_code == 200
    json_data = response.json()
    assert "summary" in json_data
    assert "clauses" in json_data
    assert "disclaimer" in json_data
    assert json_data["processing_time_seconds"] >= 0

def test_analyze_text_endpoint_too_short():
    response = client.post(
        "/api/analyze-text",
        json={"text": "too short"}
    )
    assert response.status_code == 422 or response.status_code == 400

def test_qa_endpoint(sample_contract_text):
    response = client.post(
        "/api/qa",
        json={
            "question": "What is the termination notice period?",
            "document_text": sample_contract_text
        }
    )
    assert response.status_code == 200
    json_data = response.json()
    assert "answer" in json_data
    assert "lawyer_followups" in json_data
    assert "disclaimer" in json_data

def test_analyze_file_endpoint_txt(sample_contract_text):
    response = client.post(
        "/api/analyze-file",
        files={"file": ("contract.txt", sample_contract_text.encode("utf-8"), "text/plain")}
    )
    assert response.status_code == 200
    json_data = response.json()
    assert "summary" in json_data
    assert "clauses" in json_data

def test_analyze_file_invalid_extension():
    response = client.post(
        "/api/analyze-file",
        files={"file": ("contract.exe", b"executable content", "application/octet-stream")}
    )
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]
