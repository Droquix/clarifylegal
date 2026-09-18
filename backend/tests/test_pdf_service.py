import pytest
from fastapi import HTTPException

from backend.services.pdf_service import (
    extract_text_from_pdf_bytes,
    sanitize_and_clean_text
)

def test_sanitize_and_clean_text():
    raw_text = "   Line 1  \n\n\n   Line 2   \n   \n Line 3 "
    cleaned = sanitize_and_clean_text(raw_text)
    assert cleaned == "Line 1\nLine 2\nLine 3"

def test_extract_text_from_empty_pdf_bytes_raises_error():
    with pytest.raises(HTTPException) as exc_info:
        extract_text_from_pdf_bytes(b"")
    assert exc_info.value.status_code == 400

def test_extract_text_from_invalid_pdf_bytes_raises_error():
    with pytest.raises(HTTPException) as exc_info:
        extract_text_from_pdf_bytes(b"invalid pdf content stream")
    assert exc_info.value.status_code in [400, 422]
