from fastapi import APIRouter, UploadFile, Depends,File,HTTPException
from app.services.storage import storageClient
from app.services.upload import verify_upload
from app.services.dataframe import normalize_csv
from app.core.config import settings
from app.database.session import get_db
from app.database.models import Dataset
from sqlalchemy.orm import Session
import uuid
import io

router = APIRouter(prefix="/datasets", tags=["Datasets"])




@router.post("/upload")
def upload_dataset(file: UploadFile = File(...), db : Session = Depends(get_db)):

    uploaded_file = verify_upload(file)

    df = normalize_csv(uploaded_file.data)

    dataset_id = uuid.uuid4()

    clerk_user_id = "user_placeholder"

    storage_key = storageClient.compile_path(clerk_user_id, str(dataset_id))

    parquet_buffer = io.BytesIO()

    df.write_parquet(
        parquet_buffer,
        compression = settings.PARQUET_COMPRESSION
    )

    parquet_bytes = parquet_buffer.getvalue()

    try:
        storageClient.upload_file_bytes(
            file_bytes=parquet_bytes,
            user_id=clerk_user_id,
            dataset_id=str(dataset_id),
            content_type="application/parquet"
        )


    except RuntimeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to store file in object storage: {str(e)}"
        )


    schema_metadata = {
        col: str(dtype) for col, dtype in df.schema.items()
    }

    new_dataset = Dataset(
        id=dataset_id,
        clerk_user_id=clerk_user_id,
        display_name=uploaded_file.filename,
        storage_key=storage_key,
        schema_metadata=schema_metadata,
        row_count=df.height,  # Number of rows in DataFrame
    )
    
    db.add(new_dataset)
    db.commit()
    db.refresh(new_dataset)
    
    # Step 8: Return success response
    return {
        "id": str(new_dataset.id),
        "display_name": new_dataset.display_name,
        "storage_key": new_dataset.storage_key,
        "row_count": new_dataset.row_count,
        "schema_metadata": new_dataset.schema_metadata,
        "created_at": new_dataset.created_at.isoformat() if new_dataset.created_at else None,
    }



    