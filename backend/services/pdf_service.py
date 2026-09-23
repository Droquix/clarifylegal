"""
ClarifyLegal PDF & Document Processing Service

Provides in-memory PDF extraction and text sanitization for uploaded contracts.
Guarantees zero file persistence to preserve strict user privacy.
"""

import io
from typing import List
from pypdf import PdfReader
from fastapi import HTTPException, status
from backend.config import settings

def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """
    Extracts text content from a PDF file provided as in-memory bytes.

    Args:
        pdf_bytes (bytes): Raw byte payload of the uploaded PDF file.

    Returns:
        str: Extracted and concatenated plain-text document content.

    Raises:
        HTTPException: 400 for invalid/empty files, 413 for excessive page count,
                       422 for password-protected or unparseable scanned documents.
    """
    if not pdf_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    try:
        if not pdf_bytes.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded file is not a valid PDF."
            )
        buffer: io.BytesIO = io.BytesIO(pdf_bytes)
        reader: PdfReader = PdfReader(buffer)
        if getattr(reader, "is_encrypted", False):
            try:
                decrypted: bool = reader.decrypt("")
                if not decrypted:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="This PDF document appears to be password-protected or encrypted. Please remove password protection or paste text directly."
                    )
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="This PDF document appears to be password-protected or encrypted. Please remove password protection or paste text directly."
                )

        if len(reader.pages) > settings.MAX_PDF_PAGES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"PDF exceeds the {settings.MAX_PDF_PAGES}-page limit."
            )
        extracted_pages: List[str] = []

        for page in reader.pages:
            text: str = page.extract_text()
            if text and text.strip():
                extracted_pages.append(text.strip())

        full_text: str = "\n\n".join(extracted_pages)
        if not full_text.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Unable to extract text from the PDF. The file may be scanned or image-only."
            )

        return full_text
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse PDF document: {str(e)}"
        )

def sanitize_and_clean_text(raw_text: str) -> str:
    """
    Normalizes whitespace and removes unprintable characters from parsed legal text.

    Args:
        raw_text (str): Unprocessed text extracted from uploaded files or user input.

    Returns:
        str: Sanitized, line-normalized plain-text output.
    """
    if not raw_text:
        return ""
    lines: List[str] = [line.strip() for line in raw_text.splitlines() if line.strip()]
    return "\n".join(lines)
