"""
Database session management for Neon PostgreSQL.
Uses synchronous SQLAlchemy with psycopg2 driver.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Create sync engine with connection pooling
# psycopg2 accepts sslmode=require in the connection string
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,  # Detect stale connections (important for Neon's serverless behavior)
    echo=False,  # Set to True for SQL debugging
)

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# Base class for all ORM models
Base = declarative_base()


def get_db():
    """
    Dependency for FastAPI endpoints.
    Yields a database session and handles commit/rollback automatically.
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()