import io
from pypdf import PdfReader
from fastapi import HTTPException, status

def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """
    Extracts text content from a PDF file provided as in-memory bytes.
    Does NOT write anything to disk, preserving strict user privacy.
    """
    if not pdf_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    try:
        buffer = io.BytesIO(pdf_bytes)
        reader = PdfReader(buffer)
        extracted_pages = []

        for page_idx, page in enumerate(reader.pages):
            text = page.extract_text()
            if text and text.strip():
                extracted_pages.append(text.strip())

        full_text = "\n\n".join(extracted_pages)
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
    Normalizes whitespace and cleans unprintable characters from parsed legal text.
    """
    if not raw_text:
        return ""
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    return "\n".join(lines)
