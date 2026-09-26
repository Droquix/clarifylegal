import io
import pytest
from unittest.mock import patch
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pypdf import PdfWriter
import httpx

from backend.main import app
from backend.services.pdf_service import extract_text_from_pdf_bytes
from backend.services.ai_service import analyze_document_with_ai, answer_question_with_ai

client = TestClient(app)

# ---------------------------------------------------------------------------
# 1. MALFORMED & CORRUPT PDF EDGE CASES
# ---------------------------------------------------------------------------

def test_malformed_pdf_without_pdf_header_raises_bad_request():
    """Verify raw non-PDF bytes immediately trigger 400 Bad Request."""
    corrupt_bytes = b"THIS IS NOT A REAL PDF FILE"
    with pytest.raises(HTTPException) as exc_info:
        extract_text_from_pdf_bytes(corrupt_bytes)
    assert exc_info.value.status_code == 400
    assert "not a valid PDF" in exc_info.value.detail


def test_malformed_pdf_header_with_corrupt_structure_raises_error():
    """Verify file starting with %PDF- but corrupt structure raises 400 parse error."""
    corrupt_pdf = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nCORRUPT_BYTES_TRUNCATED"
    with pytest.raises(HTTPException) as exc_info:
        extract_text_from_pdf_bytes(corrupt_pdf)
    assert exc_info.value.status_code in [400, 422]


# ---------------------------------------------------------------------------
# 2. OVERSIZED FILE & PAYLOAD EDGE CASES
# ---------------------------------------------------------------------------

def test_oversized_text_payload_rejected_by_api():
    """Verify endpoint rejects payloads exceeding 30,000 characters."""
    oversized_text = "A" * 30005
    response = client.post("/api/analyze-text", json={"text": oversized_text})
    assert response.status_code == 422


def test_oversized_pdf_exceeding_page_limit_raises_entity_too_large():
    """Verify PDF exceeding max page limit raises 413 Request Entity Too Large."""
    writer = PdfWriter()
    for _ in range(105):  # default MAX_PDF_PAGES is 100
        writer.add_blank_page(width=612, height=792)

    buffer = io.BytesIO()
    writer.write(buffer)
    oversized_pdf_bytes = buffer.getvalue()

    with pytest.raises(HTTPException) as exc_info:
        extract_text_from_pdf_bytes(oversized_pdf_bytes)
    assert exc_info.value.status_code == 413
    assert "exceeds the 100-page limit" in exc_info.value.detail


# ---------------------------------------------------------------------------
# 3. EMPTY DOCUMENT EDGE CASES
# ---------------------------------------------------------------------------

def test_empty_pdf_bytes_raises_bad_request():
    """Verify empty 0-byte PDF payload raises 400 Bad Request."""
    with pytest.raises(HTTPException) as exc_info:
        extract_text_from_pdf_bytes(b"")
    assert exc_info.value.status_code == 400
    assert "file is empty" in exc_info.value.detail


def test_pdf_with_blank_pages_only_raises_unprocessable_entity():
    """Verify valid PDF containing no extractable text raises 422 Unprocessable Entity."""
    writer = PdfWriter()
    writer.add_blank_page(width=612, height=792)
    buffer = io.BytesIO()
    writer.write(buffer)
    blank_pdf_bytes = buffer.getvalue()

    with pytest.raises(HTTPException) as exc_info:
        extract_text_from_pdf_bytes(blank_pdf_bytes)
    assert exc_info.value.status_code == 422
    assert "Unable to extract text" in exc_info.value.detail


def test_empty_text_payload_rejected_by_api():
    """Verify empty text string is rejected by API validation."""
    response = client.post("/api/analyze-text", json={"text": ""})
    assert response.status_code in [400, 422]


def test_short_text_payload_under_min_length_rejected():
    """Verify text under minimum character threshold (20 chars) is rejected."""
    response = client.post("/api/analyze-text", json={"text": "Short text"})
    assert response.status_code in [400, 422]


# ---------------------------------------------------------------------------
# 4. API TIMEOUT SIMULATION EDGE CASES
# ---------------------------------------------------------------------------

def test_api_timeout_simulation_raises_502_bad_gateway():
    """Simulate httpx HTTP timeout during document analysis, verifying 502 Bad Gateway response."""
    sample_text = "CONFIDENTIALITY AGREEMENT. " * 10
    with patch("backend.services.ai_service.settings.NVIDIA_API_KEY", "nvapi-test-key"):
        with patch("httpx.Client.post") as mock_post:
            mock_post.side_effect = httpx.TimeoutException("Connection timed out after 120.0 seconds")

            with pytest.raises(HTTPException) as exc_info:
                analyze_document_with_ai(sample_text)

            assert exc_info.value.status_code == 502
            assert "document analysis encountered an error" in exc_info.value.detail


def test_api_timeout_simulation_in_qa_service():
    """Simulate timeout during Q&A request, verifying proper 502 error escalation."""
    sample_text = "CONFIDENTIALITY AGREEMENT. " * 10
    with patch("backend.services.ai_service.settings.NVIDIA_API_KEY", "nvapi-test-key"):
        with patch("httpx.Client.post") as mock_post:
            mock_post.side_effect = httpx.TimeoutException("Read timeout after 120.0s")

            with pytest.raises(HTTPException) as exc_info:
                answer_question_with_ai("What is the penalty?", sample_text)

            assert exc_info.value.status_code == 502
            assert "document Q&A encountered an error" in exc_info.value.detail
