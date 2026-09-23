"""
ClarifyLegal Configuration Module

Loads environment variables, default threshold parameters, and CORS settings.
"""

import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

# Try loading from backend/.env or root .env
base_dir: Path = Path(__file__).resolve().parent
load_dotenv(dotenv_path=base_dir / ".env")
load_dotenv(dotenv_path=base_dir.parent / ".env")

class Settings:
    """Application settings and threshold limits."""
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "").strip()
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.6-flash").strip()
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "127.0.0.1")
    
    # Default allowed origins including live production deployment & local hosts
    DEFAULT_ORIGINS: str = (
        "http://localhost:5173,"
        "http://127.0.0.1:5173,"
        "https://clarifylegal.vercel.app,"
        "*"
    )
    
    CORS_ORIGINS: List[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", DEFAULT_ORIGINS).split(",")
        if origin.strip()
    ]
    
    MAX_FILE_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB
    MAX_DOCUMENT_CHARS: int = int(os.getenv("MAX_DOCUMENT_CHARS", "30000"))
    MAX_QUESTION_CHARS: int = int(os.getenv("MAX_QUESTION_CHARS", "1000"))
    MAX_PDF_PAGES: int = int(os.getenv("MAX_PDF_PAGES", "100"))

settings: Settings = Settings()
