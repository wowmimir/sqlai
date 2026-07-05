from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import ChatMessage
from app.core.security import get_current_user
from app.services.query import (
    compile_and_execute_query,
    OllamaError,
    OllamaTimeoutError,
    OllamaConnectionError,
    OllamaResponseError
)
import uuid
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/query", tags=["Query"])

class QueryRequest(BaseModel):
    project_id: uuid.UUID
    prompt: str

class QueryResponse(BaseModel):
    columns: List[str]
    rows: List[Dict[str, Any]]


@router.post("/execute", response_model=QueryResponse)
def execute_query(
    request: QueryRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """
    Execute a natural language query against all datasets in a project.
    Returns the result as columns + rows.
    """
    clerk_user_id = user["clerk_user_id"]
    project_id = request.project_id

    # Log user message synchronously before execution
    user_msg = ChatMessage(
        clerk_user_id=clerk_user_id,
        project_id=project_id,
        role="user",
        content=request.prompt
    )
    db.add(user_msg)
    db.commit()

    try:
        # Use the unified function, now returning result and redis_cache_key
        result, redis_cache_key = compile_and_execute_query(
            user_prompt=request.prompt,
            project_id=str(project_id),
            clerk_user_id=clerk_user_id,
            db=db
        )

        # Log assistant message on success with cache pointer
        assistant_msg = ChatMessage(
            clerk_user_id=clerk_user_id,
            project_id=project_id,
            role="assistant",
            content="Query executed successfully.",  # Generic narrative as UI handles the rest
            redis_cache_key=redis_cache_key
        )
        db.add(assistant_msg)
        db.commit()

        return result

    except ValueError as e:
        error_msg = ChatMessage(
            clerk_user_id=clerk_user_id,
            project_id=project_id,
            role="error",
            content=str(e)
        )
        db.add(error_msg)
        db.commit()
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        error_msg = ChatMessage(
            clerk_user_id=clerk_user_id,
            project_id=project_id,
            role="error",
            content=str(e)
        )
        db.add(error_msg)
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))
    except (OllamaTimeoutError, OllamaConnectionError) as e:
        error_msg = ChatMessage(
            clerk_user_id=clerk_user_id,
            project_id=project_id,
            role="error",
            content=f"LLM unavailable: {str(e)}"
        )
        db.add(error_msg)
        db.commit()
        raise HTTPException(status_code=503, detail=f"LLM unavailable: {str(e)}")
    except OllamaResponseError as e:
        error_msg = ChatMessage(
            clerk_user_id=clerk_user_id,
            project_id=project_id,
            role="error",
            content=f"LLM response error: {str(e)}"
        )
        db.add(error_msg)
        db.commit()
        raise HTTPException(status_code=502, detail=f"LLM response error: {str(e)}")
    except OllamaError as e:
        error_msg = ChatMessage(
            clerk_user_id=clerk_user_id,
            project_id=project_id,
            role="error",
            content=f"LLM error: {str(e)}"
        )
        db.add(error_msg)
        db.commit()
        raise HTTPException(status_code=500, detail=f"LLM error: {str(e)}")
    except Exception as e:
        logger.exception("Unexpected error in query execution")
        error_msg = ChatMessage(
            clerk_user_id=clerk_user_id,
            project_id=project_id,
            role="error",
            content="Internal server error"
        )
        db.add(error_msg)
        db.commit()
        raise HTTPException(status_code=500, detail="Internal server error")