from fastapi import APIRouter,HTTPException,Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.security import get_current_user
from app.services.query import get_project_schemas,build_prompt,generate_sql,validate_sql
import uuid
from pydantic import BaseModel
from app.services.query import OllamaError, OllamaTimeoutError, OllamaConnectionError, OllamaResponseError

router = APIRouter(prefix="/query", tags=["Query"])

class QueryRequest(BaseModel):
    project_id: uuid.UUID
    prompt: str


@router.post("/execute")
def execute_query(
    request : QueryRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user) # Enforces Clerk Auth
):
    clerk_user_id = user["clerk_user_id"]

    try:

        schemas = get_project_schemas(db, str(request.project_id), clerk_user_id)

        if not schemas:
            raise HTTPException(status_code=400, detail="No datasets in this project.")

        final_prompt = build_prompt(request.prompt, schemas)

        final_sql = generate_sql(final_prompt)

        is_unanswerable, tree, err = validate_sql(final_sql)

        if err:
            raise HTTPException(status_code=400, detail=err)
        if is_unanswerable:
            return {"sql": "UNANSWERABLE", "schemas": schemas, "answerable": False}
        
        

        return {"sql": final_sql, "schemas": schemas, "answerable": True}
    
    except (OllamaTimeoutError, OllamaConnectionError, OllamaResponseError) as e:
        raise HTTPException(status_code=503, detail=f"LLM unavailable: {str(e)}")
    except (OllamaResponseError,OllamaError) as e:
        raise HTTPException(status_code=500, detail=str(e))
