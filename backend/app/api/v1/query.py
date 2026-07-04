from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.security import get_current_user
from app.services.query import (
    compile_and_execute_query,  # ← NEW import
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

    try:
        # Use the new unified function
        result = compile_and_execute_query(
            user_prompt=request.prompt,
            project_id=str(request.project_id),
            clerk_user_id=clerk_user_id,
            db=db
        )

        # The result already has 'columns' and 'rows'
        return result

    except ValueError as e:
        # This may include "LLM returned empty SQL output" or "UNANSWERABLE"
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        # DuckDB or other runtime errors
        raise HTTPException(status_code=500, detail=str(e))
    except (OllamaTimeoutError, OllamaConnectionError) as e:
        raise HTTPException(status_code=503, detail=f"LLM unavailable: {str(e)}")
    except OllamaResponseError as e:
        # This includes malformed JSON or missing fields
        raise HTTPException(status_code=502, detail=f"LLM response error: {str(e)}")
    except OllamaError as e:
        raise HTTPException(status_code=500, detail=f"LLM error: {str(e)}")
    except Exception as e:
        logger.exception("Unexpected error in query execution")
        raise HTTPException(status_code=500, detail="Internal server error")