from fastapi import UploadFile, HTTPException
from app.core.config import settings
from dataclasses import dataclass

@dataclass(slots=True)
class UploadedFile:
    filename: str
    content_type: str
    data: bytes
    size: int


def verify_upload(file: UploadFile) -> bytes:
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file supplied."
        )

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are currently supported."
        )


    file_bytes = file.file.read()

    actual_size = len(file_bytes)

    if actual_size > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Maximum upload size exceeded."
        )

    
    
    return UploadedFile(
        filename=file.filename,
        content_type=file.content_type,
        data=file_bytes,
        size=actual_size,
    )