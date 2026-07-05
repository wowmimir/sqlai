import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database.session import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clerk_user_id = Column(String(255), nullable=False, index=True)
    display_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    datasets = relationship(
        "Dataset", back_populates="project", cascade="all, delete-orphan"
    )
    semantic_prompts = relationship(
        "SemanticPromptCache", back_populates="project", cascade="all, delete-orphan"
    )

    # ✅ Add this line:
    chat_messages = relationship(
        "ChatMessage", back_populates="project", cascade="all, delete-orphan"
    )


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    clerk_user_id = Column(String(255), nullable=False, index=True)
    display_name = Column(String(255), nullable=False)
    storage_key = Column(String(512), nullable=False)
    schema_metadata = Column(JSONB, nullable=False, default={})
    row_count = Column(BigInteger, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="datasets")


class SemanticPromptCache(Base):
    __tablename__ = "semantic_prompt_cache"
    __table_args__ = (
        Index(
            "idx_prompt_embedding_hnsw",
            "prompt_embedding",
            postgresql_using="hnsw",
            postgresql_ops={"prompt_embedding": "vector_cosine_ops"},
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clerk_user_id = Column(String(255), nullable=False, index=True)
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    raw_user_prompt = Column(Text, nullable=False)  # Changed to Text
    compiled_sql_query = Column(Text, nullable=False)  # Changed to Text
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    prompt_embedding = Column(Vector(1536), nullable=False)  # Removed trailing comma
    selected_tables = Column(JSONB, nullable=False, default={})
    schema_snapshot = Column(JSONB, nullable=False, default={})  # 👈 NEW
    project = relationship("Project", back_populates="semantic_prompts")


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    __table_args__ = (
        Index("idx_chat_messages_lookup", "clerk_user_id", "project_id", "created_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clerk_user_id = Column(String(255), nullable=False, index=True)
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    role = Column(String(50), nullable=False)  # 'user', 'assistant', or 'error'
    content = Column(Text, nullable=False)
    redis_cache_key = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="chat_messages")
