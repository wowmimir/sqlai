from fastapi import APIRouter, UploadFile, Depends, File, HTTPException
from app.services.storage import storageClient
from app.services.upload import verify_upload
from app.services.dataframe import normalize_csv
from app.core.config import settings
from app.database.session import get_db
from app.database.models import Dataset, Project
from app.core.security import get_current_user
from sqlalchemy.orm import Session
import uuid
import io

router = APIRouter(prefix="/projects/{project_id}/datasets", tags=["Datasets"])

@router.post("/upload")
def upload_dataset(
    project_id: uuid.UUID,
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user) # Enforces Clerk Auth
):
    # 1. Security & Context Check: Ensure project belongs to user
    project = db.query(Project).filter(
        Project.id == project_id, 
        Project.clerk_user_id == user["clerk_user_id"]
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or access denied.")

    # 2. Process File
    uploaded_file = verify_upload(file)
    df = normalize_csv(uploaded_file.data)
    
    dataset_id = uuid.uuid4()
    clerk_user_id = user["clerk_user_id"] # Real Clerk ID from JWT

    parquet_buffer = io.BytesIO()

    df.write_parquet(
        parquet_buffer,
        compression = settings.PARQUET_COMPRESSION
    )

    parquet_bytes = parquet_buffer.getvalue()
    
    # 3. Upload to R2 (New Project-scoped path)
    try:
        storageClient.upload_file_bytes(
            file_bytes=parquet_bytes, # Simplified buffer write
            project_id=str(project_id),
            dataset_id=str(dataset_id),
            content_type="application/parquet"
        )
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to store file: {str(e)}")

    # 4. Save Metadata to DB
    schema_metadata = {col: str(dtype) for col, dtype in df.schema.items()}
    
    new_dataset = Dataset(
        id=dataset_id,
        project_id=project.id,
        clerk_user_id=clerk_user_id,
        display_name=uploaded_file.filename,
        storage_key=storageClient.compile_path(str(project_id), str(dataset_id)),
        schema_metadata=schema_metadata,
        row_count=df.height,
    )
    
    db.add(new_dataset)
    db.commit()
    db.refresh(new_dataset)
    
    return {
        "id": str(new_dataset.id),
        "project_id": str(new_dataset.project_id),
        "display_name": new_dataset.display_name,
        "row_count": new_dataset.row_count,
    }