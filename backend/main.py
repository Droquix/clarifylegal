import time
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.config import settings
from backend.models.schemas import AnalysisResponse, QARequest, QAResponse
from backend.services.pdf_service import extract_text_from_pdf_bytes, sanitize_and_clean_text
from backend.services.gemini_service import analyze_document_with_gemini, answer_question_with_gemini

app = FastAPI(
    title="ClarifyLegal API",
    description="Privacy-first, in-memory legal document simplification API powered by Google Gemini.",
    version="1.0.0"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=20, description="Raw document text to analyze")

@app.get("/health")
def health_check():
    """Health check endpoint displaying API status and configuration."""
    return {
        "status": "healthy",
        "app": "ClarifyLegal API",
        "version": "1.0.0",
        "privacy_guarantee": "Zero persistence. In-memory processing only.",
        "gemini_api_configured": bool(settings.GEMINI_API_KEY)
    }

@app.post("/api/analyze-file", response_model=AnalysisResponse)
async def analyze_document_file(file: UploadFile = File(...)):
    """
    Parses uploaded PDF or text file strictly in memory, extracts content,
    and generates plain-English analysis with risk scores and clause breakdowns.
    """
    start_time = time.time()

    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided in upload."
        )

    filename_lower = file.filename.lower()
    if not (filename_lower.endswith(".pdf") or filename_lower.endswith(".txt")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload a .pdf or .txt file."
        )

    # Read bytes directly in memory
    file_bytes = await file.read()
    if len(file_bytes) > settings.MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB."
        )

    if filename_lower.endswith(".pdf"):
        extracted_text = extract_text_from_pdf_bytes(file_bytes)
    else:
        try:
            extracted_text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            extracted_text = file_bytes.decode("latin-1")

    clean_text = sanitize_and_clean_text(extracted_text)
    if not clean_text or len(clean_text) < 20:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Extracted document content is too short or empty."
        )

    analysis_result = analyze_document_with_gemini(clean_text)
    elapsed = time.time() - start_time
    analysis_result["processing_time_seconds"] = round(elapsed, 2)

    return analysis_result

@app.post("/api/analyze-text", response_model=AnalysisResponse)
async def analyze_document_text(payload: TextAnalysisRequest):
    """
    Analyzes raw text pasted directly by the user.
    """
    start_time = time.time()
    clean_text = sanitize_and_clean_text(payload.text)

    if not clean_text or len(clean_text) < 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pasted text must be at least 20 characters long."
        )

    analysis_result = analyze_document_with_gemini(clean_text)
    elapsed = time.time() - start_time
    analysis_result["processing_time_seconds"] = round(elapsed, 2)

    return analysis_result

@app.post("/api/qa", response_model=QAResponse)
async def ask_document_question(payload: QARequest):
    """
    Answers a specific user question grounded in the provided document context.
    """
    if not payload.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty."
        )

    qa_result = answer_question_with_gemini(payload.question, payload.document_text)
    return qa_result
