import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from backend.config import settings
from backend.models.schemas import (
    AnalysisResponse,
    ComparisonResponse,
    DocumentComparisonRequest,
    QARequest,
    QAResponse,
)
from backend.services.pdf_service import extract_text_from_pdf_bytes, sanitize_and_clean_text
from backend.services.gemini_service import (
    analyze_document_with_gemini,
    answer_question_with_gemini,
    compare_documents_with_gemini,
)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("clarifylegal.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    key_present = bool(settings.GEMINI_API_KEY)
    logger.info("==================================================================")
    logger.info("ClarifyLegal API Starting Up...")
    logger.info("AI provider key configured: %s", key_present)
    logger.info("==================================================================")
    yield
    logger.info("ClarifyLegal API Shutting Down...")

app = FastAPI(
    title="ClarifyLegal API",
    description="In-memory legal document simplification API using a configured third-party AI provider.",
    version="1.0.0",
    lifespan=lifespan
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
    text: str = Field(..., min_length=20, max_length=30000, description="Raw document text to analyze")

@app.get("/health")
@app.get("/api/health")
def health_check():
    """Health check endpoint displaying API status and configuration."""
    return {
        "status": "healthy",
        "app": "ClarifyLegal API",
        "version": "1.0.0",
        "processing_notice": "Documents are not stored in an application database and are sent to the configured AI provider for analysis.",
        "ai_provider_configured": bool(settings.GEMINI_API_KEY)
    }


async def clean_uploaded_document(file: UploadFile) -> str:
    """Read and validate an allowed upload without persisting it to disk."""
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No filename provided in upload.")

    filename_lower = file.filename.lower()
    if not (filename_lower.endswith(".pdf") or filename_lower.endswith(".txt")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload a .pdf or .txt file."
        )

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
async def analyze_document_file(file: UploadFile = File(...)):
    """
    Parses uploaded PDF or text file strictly in memory, extracts content,
    and generates plain-English analysis with risk scores and clause breakdowns.
    """
    start_time = time.time()

    clean_text = await clean_uploaded_document(file)

    analysis_result = await run_in_threadpool(analyze_document_with_gemini, clean_text)
    analysis_result["extracted_text"] = clean_text
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
    if len(clean_text) > settings.MAX_DOCUMENT_CHARS:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Pasted text exceeds the {settings.MAX_DOCUMENT_CHARS:,}-character limit."
        )

    analysis_result = await run_in_threadpool(analyze_document_with_gemini, clean_text)
    analysis_result["extracted_text"] = clean_text
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

    logger.info("POST /api/qa received. Document text length: %s chars", len(payload.document_text))
    qa_result = await run_in_threadpool(answer_question_with_gemini, payload.question, payload.document_text)
    return qa_result


@app.post("/api/compare-text", response_model=ComparisonResponse)
async def compare_document_text(payload: DocumentComparisonRequest):
    """Compare pasted original and revised documents using source-backed AI output."""
    original_text = sanitize_and_clean_text(payload.original_text)
    revised_text = sanitize_and_clean_text(payload.revised_text)
    if len(original_text) < 20 or len(revised_text) < 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both original and revised text must contain at least 20 characters."
        )

    start_time = time.time()
    comparison = await run_in_threadpool(compare_documents_with_gemini, original_text, revised_text)
    comparison["processing_time_seconds"] = round(time.time() - start_time, 2)
    return comparison


@app.post("/api/compare-files", response_model=ComparisonResponse)
async def compare_document_files(
    original_file: UploadFile = File(...),
    revised_file: UploadFile = File(...),
):
    """Compare uploaded PDF or TXT document versions without persisting either file."""
    original_text = await clean_uploaded_document(original_file)
    revised_text = await clean_uploaded_document(revised_file)
    start_time = time.time()
    comparison = await run_in_threadpool(compare_documents_with_gemini, original_text, revised_text)
    comparison["processing_time_seconds"] = round(time.time() - start_time, 2)
    return comparison
