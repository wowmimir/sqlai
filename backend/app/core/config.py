from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[3]
ENV_FILE = BASE_DIR / ".env"

class Settings(BaseSettings):
    """
    Global application configuration.

    Loads values from the project's .env file once during startup
    and exposes them as strongly typed attributes.
    """

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # --------------------------------------------------
    # Application
    # --------------------------------------------------
    ENV: str = "development"
    PROJECT_NAME: str = "sqlai"

    # --------------------------------------------------
    # Cloudflare R2
    # --------------------------------------------------
    R2_BUCKET_NAME: str
    R2_ACCOUNT_ID: str
    R2_ACCESS_KEY_ID: str
    R2_SECRET_ACCESS_KEY: str

    # Optional but recommended
    R2_ENDPOINT_URL: str | None = None

    # --------------------------------------------------
    # Neon PostgreSQL
    # --------------------------------------------------
    DATABASE_URL: str

    # --------------------------------------------------
    # Upstash Redis
    # --------------------------------------------------
    
    UPSTASH_REDIS_URL : str
    # --------------------------------------------------
    # Clerk
    # --------------------------------------------------
    CLERK_SECRET_KEY: str
    CLERK_JWKS_URL: str

    # --------------------------------------------------
    # System Configuration
    # --------------------------------------------------
    MAX_UPLOAD_SIZE_MB: int = 20
    MAX_RESULT_ROWS: int = 250

    CACHE_SIMILARITY_THRESHOLD: float = 0.04

    PARQUET_COMPRESSION: str = "snappy"

    LOG_LEVEL: str = "INFO"

    MAX_UPLOAD_SIZE_BYTES: int = MAX_UPLOAD_SIZE_MB * 1024 * 1024

    DATABASE_POOL_SIZE: int =5
    DATABASE_MAX_OVERFLOW: int =10

    GEMINI_API_KEY: str

    REDIS_CACHE_TTL : int = 86400

    OLLAMA_API_KEY : str
# --------------------------------------------------



@lru_cache
def get_settings() -> Settings:
    """
    Returns a cached Settings instance.

    lru_cache ensures the .env file is parsed only once
    during the application's lifetime.
    """
    return Settings()

settings = get_settings()