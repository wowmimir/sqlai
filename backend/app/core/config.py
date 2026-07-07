from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

def get_env_file():
    # Check multiple possible locations
    possible_paths = [
        Path(__file__).resolve().parents[3] / ".env",  # Local: sqlai/.env
        Path(__file__).resolve().parents[2] / ".env",  # Docker: /app/.env
        Path.cwd() / ".env",                            # Current working dir
    ]
    
    for path in possible_paths:
        if path.exists():
            return path
    
    return None

class Settings(BaseSettings):
    """
    Global application configuration.

    Loads values from the project's .env file once during startup
    and exposes them as strongly typed attributes.
    """

    model_config = SettingsConfigDict(
        env_file=get_env_file(),
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