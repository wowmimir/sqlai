from fastapi import APIRouter,HTTPException,Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.security import get_current_user
from app.services.query import (
get_project_schemas,build_prompt,generate_sql,validate_sql,substitute_table_paths,OllamaError, OllamaTimeoutError, OllamaConnectionError, OllamaResponseError
)
from app.services.storage import storageClient
from app.core.config import settings
import uuid
from pydantic import BaseModel

router = APIRouter(prefix="/query", tags=["Query"])

class QueryRequest(BaseModel):
    project_id: uuid.UUID
    prompt: str


@router.post("/execute")
def execute_query(
    request: QueryRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    clerk_user_id = user["clerk_user_id"]

    try:
        # 1. Fetch schemas for the project
        schemas = get_project_schemas(db, str(request.project_id), clerk_user_id)

        if not schemas:
            raise HTTPException(status_code=400, detail="No datasets in this project.")

        # 2. Build prompt and get raw SQL from LLM
        final_prompt = build_prompt(request.prompt, schemas)
        final_sql = generate_sql(final_prompt)

        # 3. Validate SQL → get AST tree
        is_unanswerable, tree, err = validate_sql(final_sql)
        if err:
            raise HTTPException(status_code=400, detail=err)
        if is_unanswerable:
            return {"sql": "UNANSWERABLE", "schemas": schemas, "answerable": False}

        # 4. Build mapping: logical_name → pre‑signed URL
        mapping = {}
        for s in schemas:
            url = storageClient.generate_presigned_url(
                project_id=str(request.project_id),
                dataset_id=s['dataset_id'],
                expires_in_seconds=900  # 15 minutes
            )
            mapping[s['logical_name']] = url

        # 5. Substitute table paths with read_parquet() calls
        try:
            transformed_ast = substitute_table_paths(tree, mapping)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        # 7. Render final executable SQL
        final_executable_sql = transformed_ast.sql()

        # 8. Return the substituted SQL
        return {"sql": final_executable_sql, "schemas": schemas, "answerable": True}

    except (OllamaTimeoutError, OllamaConnectionError, OllamaResponseError) as e:
        raise HTTPException(status_code=503, detail=f"LLM unavailable: {str(e)}")
    except (OllamaResponseError, OllamaError) as e:
        raise HTTPException(status_code=500, detail=str(e))