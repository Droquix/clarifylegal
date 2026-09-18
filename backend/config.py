import os
from dotenv import load_dotenv

# Load environment variables from .env file if available
load_dotenv()

class Settings:
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "").strip()
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "127.0.0.1")
    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
        if origin.strip()
    ]
    MAX_FILE_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB max file upload size in-memory

settings = Settings()
