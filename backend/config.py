import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # App Settings
    PROJECT_NAME: str = "TalentAI API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Database Settings
    # Default to sqlite relative to current directory if not set
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./talentai.db")

    # JWT Security Settings
    JWT_SECRET: str = os.getenv("JWT_SECRET", "supersecretkeytalentai1234567890!@#")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120

    # AI Configurations
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")

    # Uploads
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")

    # Sentence Transformers model path/name
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=(".env", "../.env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
