import io
import pytest
from pypdf import PdfWriter

@pytest.fixture
def sample_contract_text():
    return (
        "CONFIDENTIALITY AND NON-DISCLOSURE AGREEMENT\n\n"
        "This Non-Disclosure Agreement ('Agreement') is entered into between Disclosing Party "
        "and Receiving Party as of January 15, 2026.\n\n"
        "1. Confidential Information. Receiving Party agrees to maintain in strict confidence "
        "all non-public technical and business information supplied by Disclosing Party.\n\n"
        "2. Indemnification. Receiving Party agrees to defend, indemnify, and hold harmless Disclosing Party "
        "from any third party claims or reasonable attorney fees.\n\n"
        "3. Termination. Either party may terminate this Agreement upon providing 30 days written notice.\n\n"
        "4. Governing Law. This Agreement shall be governed by Delaware law."
    )

@pytest.fixture
def sample_pdf_bytes(sample_contract_text):
    """Dynamically creates a valid PDF byte buffer in memory using pypdf."""
    writer = PdfWriter()
    page = writer.add_blank_page(width=612, height=792)
    # Adding annotation text to blank page or using basic stream write
    # We can write text using simple pdf stream layout or basic pypdf page creation
    buffer = io.BytesIO()
    writer.write(buffer)
    buffer.seek(0)
    return buffer.getvalue()
