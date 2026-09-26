"""
ClarifyLegal FastAPI Backend Server

Provides privacy-focused, in-memory legal document simplification, risk scoring,
source-grounded Q&A, and side-by-side version comparison APIs. Includes response compression,
sliding-window rate limiting, and persistent process compatibility for Render hosting.
"""

import time
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any
from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from backend.config import settings
from backend.middleware.rate_limiter import RateLimitMiddleware
from backend.models.schemas import (
    AnalysisResponse,
    ComparisonResponse,
    DocumentComparisonRequest,
    QARequest,
    QAResponse,
)
from backend.services.pdf_service import extract_text_from_pdf_bytes, sanitize_and_clean_text
from backend.services.ai_service import (
    analyze_document_with_ai,
    answer_question_with_ai,
    compare_documents_with_ai,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("clarifylegal.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    key_present: bool = bool(settings.NVIDIA_API_KEY)
    logger.info("==================================================================")
    logger.info("ClarifyLegal API Starting Up...")
    logger.info("NVIDIA AI provider key configured: %s", key_present)
    logger.info("==================================================================")
    yield
    logger.info("ClarifyLegal API Shutting Down...")

app: FastAPI = FastAPI(
    title="ClarifyLegal API",
    description="In-memory legal document simplification API powered by NVIDIA NIM (Meta Llama 3.2).",
    version="1.0.0",
    lifespan=lifespan
)

# 1. GZip Response Compression Middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 2. Per-IP Sliding-Window Rate Limiting Middleware (15 requests/min per IP)
app.add_middleware(RateLimitMiddleware, requests_per_minute=15)

# 3. Cross-Origin Resource Sharing (CORS) Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

class TextAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=20, max_length=30000, description="Raw document text to analyze")

@app.get("/health")
@app.get("/api/health")
def health_check() -> Dict[str, Any]:
    """Health check endpoint displaying API status and configuration."""
    return {
        "status": "healthy",
        "app": "ClarifyLegal API",
        "version": "1.0.0",
        "ai_provider": "NVIDIA NIM (Meta Llama 3.2)",
        "processing_notice": "Documents are not stored in an application database and are processed in-memory.",
        "ai_provider_configured": bool(settings.NVIDIA_API_KEY)
    }


async def clean_uploaded_document(file: UploadFile) -> str:
    """Read and validate an allowed upload without persisting it to disk."""
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No filename provided in upload.")

    filename: str = file.filename
    if "\x00" in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid characters in filename.")

    filename_lower: str = filename.lower()
    if not (filename_lower.endswith(".pdf") or filename_lower.endswith(".txt")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload a .pdf or .txt file."
        )

    # Validate Content-Type header if provided
    content_type: str = (file.content_type or "").lower()
    disallowed_mime_prefixes = ("image/", "audio/", "video/", "application/x-msdownload", "application/x-executable", "application/x-sh")
    if any(content_type.startswith(prefix) for prefix in disallowed_mime_prefixes):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload a .pdf or .txt file."
        )

    file_bytes: bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    if len(file_bytes) > settings.MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB."
        )

    if filename_lower.endswith(".pdf"):
        extracted_text: str = extract_text_from_pdf_bytes(file_bytes)
    else:
        if b"\x00" in file_bytes[:1024]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text file contains binary data and cannot be processed."
            )
        try:
            extracted_text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            extracted_text = file_bytes.decode("latin-1")

    clean_text: str = sanitize_and_clean_text(extracted_text)
    if len(clean_text) > settings.MAX_DOCUMENT_CHARS:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Document text exceeds the {settings.MAX_DOCUMENT_CHARS:,}-character limit."
        )
    if len(clean_text) < 20:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Extracted document content is too short or empty."
        )
    return clean_text

@app.post("/api/analyze-file", response_model=AnalysisResponse)
@app.post("/analyze-file", response_model=AnalysisResponse)
async def analyze_document_file(file: UploadFile = File(...)):
    """
    Parses uploaded PDF or text file strictly in memory, extracts content,
    and generates plain-English analysis with risk scores and clause breakdowns.
    """
    start_time: float = time.time()

    clean_text: str = await clean_uploaded_document(file)

    analysis_result: Dict[str, Any] = await run_in_threadpool(analyze_document_with_ai, clean_text)
    analysis_result["extracted_text"] = clean_text
    elapsed: float = time.time() - start_time
    analysis_result["processing_time_seconds"] = round(elapsed, 2)

    return analysis_result

@app.post("/api/analyze-text", response_model=AnalysisResponse)
@app.post("/analyze-text", response_model=AnalysisResponse)
async def analyze_document_text(payload: TextAnalysisRequest):
    """
    Analyzes raw text pasted directly by the user.
    """
    start_time: float = time.time()
    clean_text: str = sanitize_and_clean_text(payload.text)

    if not clean_text or len(clean_text) < 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pasted text must be at least 20 characters long."
        )
    if len(clean_text) > settings.MAX_DOCUMENT_CHARS:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Pasted text exceeds the {settings.MAX_DOCUMENT_CHARS:,}-character limit."
        )

    analysis_result: Dict[str, Any] = await run_in_threadpool(analyze_document_with_ai, clean_text)
    analysis_result["extracted_text"] = clean_text
    elapsed: float = time.time() - start_time
    analysis_result["processing_time_seconds"] = round(elapsed, 2)

    return analysis_result

@app.post("/api/qa", response_model=QAResponse)
@app.post("/qa", response_model=QAResponse)
async def ask_document_question(payload: QARequest):
    """
    Answers a specific user question grounded in the provided document context.
    """
    if not payload.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty."
        )

    logger.info("POST /api/qa received. Document text length: %s chars", len(payload.document_text))
    qa_result: Dict[str, Any] = await run_in_threadpool(answer_question_with_ai, payload.question, payload.document_text)
    return qa_result


@app.post("/api/compare-text", response_model=ComparisonResponse)
@app.post("/compare-text", response_model=ComparisonResponse)
async def compare_document_text(payload: DocumentComparisonRequest):
    """Compare pasted original and revised documents using source-backed AI output."""
    original_text: str = sanitize_and_clean_text(payload.original_text)
    revised_text: str = sanitize_and_clean_text(payload.revised_text)
    if len(original_text) < 20 or len(revised_text) < 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both original and revised text must contain at least 20 characters."
        )

    start_time: float = time.time()
    comparison: Dict[str, Any] = await run_in_threadpool(compare_documents_with_ai, original_text, revised_text)
    comparison["processing_time_seconds"] = round(time.time() - start_time, 2)
    return comparison


@app.post("/api/compare-files", response_model=ComparisonResponse)
@app.post("/compare-files", response_model=ComparisonResponse)
async def compare_document_files(
    original_file: UploadFile = File(...),
    revised_file: UploadFile = File(...),
):
    """Compare uploaded PDF or TXT document versions without persisting either file."""
    original_text: str = await clean_uploaded_document(original_file)
    revised_text: str = await clean_uploaded_document(revised_file)
    start_time: float = time.time()
    comparison: Dict[str, Any] = await run_in_threadpool(compare_documents_with_ai, original_text, revised_text)
    comparison["processing_time_seconds"] = round(time.time() - start_time, 2)
    return comparison
