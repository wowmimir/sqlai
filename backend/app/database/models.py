"""
SQLAlchemy ORM models for Neon PostgreSQL tables.
Matches the schema defined in backend.md.
"""

import uuid
from sqlalchemy import Column, String, BigInteger, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.database.session import Base




class Dataset(Base):
    """
    Core ingestion record asset table.
    Stores metadata about uploaded datasets.
    """
    __tablename__ = "datasets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clerk_user_id = Column(String(255), nullable=False)
    display_name = Column(String(255), nullable=False)
    storage_key = Column(String(512), nullable=False)
    schema_metadata = Column(JSONB, nullable=False, default={})
    row_count = Column(BigInteger, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

