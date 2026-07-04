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
from typing import List
from pydantic import BaseModel

router = APIRouter(prefix="/projects/{project_id}/datasets", tags=["Datasets"])

# Pydantic models for responses
class DatasetResponse(BaseModel):
    id: str
    project_id: str
    display_name: str
    row_count: int
    schema_metadata: dict
    created_at: str
    storage_key: str

class DatasetListResponse(BaseModel):
    id: str
    display_name: str
    row_count: int
    created_at: str
    schema_metadata: dict


@router.post("/upload", response_model=DatasetResponse)
def upload_dataset(
    project_id: uuid.UUID,
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)  # Enforces Clerk Auth
):
    """
    Upload a CSV file to a project.
    Returns the created dataset metadata.
    """
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
    clerk_user_id = user["clerk_user_id"]  # Real Clerk ID from JWT

    parquet_buffer = io.BytesIO()

    df.write_parquet(
        parquet_buffer,
        compression=settings.PARQUET_COMPRESSION
    )

    parquet_bytes = parquet_buffer.getvalue()
    
    # 3. Upload to R2 (Project-scoped path)
    try:
        storageClient.upload_file_bytes(
            file_bytes=parquet_bytes,
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
        "schema_metadata": new_dataset.schema_metadata,
        "created_at": new_dataset.created_at.isoformat(),
        "storage_key": new_dataset.storage_key,
    }


@router.get("", response_model=List[DatasetListResponse])
def list_datasets(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """
    List all datasets in a project.
    Returns basic metadata for each dataset.
    """
    # 1. Security: Ensure project belongs to user
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.clerk_user_id == user["clerk_user_id"]
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or access denied.")

    # 2. Query datasets
    datasets = db.query(Dataset).filter(
        Dataset.project_id == project_id,
        Dataset.clerk_user_id == user["clerk_user_id"]
    ).order_by(Dataset.created_at.desc()).all()

    # 3. Format response
    return [
        {
            "id": str(ds.id),
            "display_name": ds.display_name,
            "row_count": ds.row_count,
            "created_at": ds.created_at.isoformat(),
            "schema_metadata": ds.schema_metadata or {},
        }
        for ds in datasets
    ]


@router.get("/{dataset_id}", response_model=DatasetResponse)
def get_dataset(
    project_id: uuid.UUID,
    dataset_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """
    Get detailed information about a specific dataset.
    """
    # 1. Security: Ensure project belongs to user
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.clerk_user_id == user["clerk_user_id"]
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or access denied.")

    # 2. Query dataset
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.project_id == project_id,
        Dataset.clerk_user_id == user["clerk_user_id"]
    ).first()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied.")

    # 3. Format response
    return {
        "id": str(dataset.id),
        "project_id": str(dataset.project_id),
        "display_name": dataset.display_name,
        "row_count": dataset.row_count,
        "schema_metadata": dataset.schema_metadata or {},
        "created_at": dataset.created_at.isoformat(),
        "storage_key": dataset.storage_key,
    }


@router.delete("/{dataset_id}")
def delete_dataset(
    project_id: uuid.UUID,
    dataset_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """
    Delete a dataset and its associated Parquet file from storage.
    """
    # 1. Security: Ensure project belongs to user
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.clerk_user_id == user["clerk_user_id"]
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or access denied.")

    # 2. Query dataset
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.project_id == project_id,
        Dataset.clerk_user_id == user["clerk_user_id"]
    ).first()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied.")

    # 3. Delete from storage (R2)
    try:
        # Delete the object from R2
        storageClient.client.delete_object(
            Bucket=storageClient.bucket_name,
            Key=dataset.storage_key
        )
    except Exception as e:
        # Log the error but continue with DB deletion
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to delete storage object {dataset.storage_key}: {e}")
        # Don't raise here - we still want to delete the DB record

    # 4. Delete from database
    db.delete(dataset)
    db.commit()

    return {"message": f"Dataset '{dataset.display_name}' deleted successfully"}


# Optional: Add a method to get dataset schema only
@router.get("/{dataset_id}/schema")
def get_dataset_schema(
    project_id: uuid.UUID,
    dataset_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """
    Get only the schema (column names and types) of a dataset.
    Useful for the frontend to display column information without loading data.
    """
    # 1. Security: Ensure project belongs to user
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.clerk_user_id == user["clerk_user_id"]
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or access denied.")

    # 2. Query dataset
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.project_id == project_id,
        Dataset.clerk_user_id == user["clerk_user_id"]
    ).first()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied.")

    # 3. Return schema only
    return {
        "dataset_id": str(dataset.id),
        "display_name": dataset.display_name,
        "columns": list(dataset.schema_metadata.keys()) if dataset.schema_metadata else [],
        "schema": dataset.schema_metadata or {},
        "row_count": dataset.row_count,
    }