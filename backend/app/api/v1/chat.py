from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import Project, ChatMessage
from app.core.security import get_current_user
from typing import List
import uuid
from pydantic import BaseModel

router = APIRouter(prefix="/chat", tags=["Chat"])

class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    redis_cache_key: str | None = None
    created_at: str

@router.get("/history", response_model=List[ChatMessageResponse])
def get_chat_history(
    project_id: uuid.UUID = Query(...),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """
    Hydrates the conversational thread for a given project.
    """
    # 1. Security: Ensure project belongs to user
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.clerk_user_id == user["clerk_user_id"]
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or access denied.")

    # 2. Fetch messages ordered chronologically
    messages = db.query(ChatMessage).filter(
        ChatMessage.project_id == project_id,
        ChatMessage.clerk_user_id == user["clerk_user_id"]
    ).order_by(ChatMessage.created_at.asc()).all()

    # 3. Format response
    return [
        {
            "id": str(msg.id),
            "role": msg.role,
            "content": msg.content,
            "redis_cache_key": msg.redis_cache_key,
            "created_at": msg.created_at.isoformat()
        } for msg in messages
    ]