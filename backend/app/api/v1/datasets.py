from fastapi import APIRouter, UploadFile, File
from app.services.storage import StorageService
from app.services.upload import verify_upload
from app.services.dataframe import normalize_csv

router = APIRouter(prefix="/datasets", tags=["Datasets"])




@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):

    uploaded_file = await verify_upload(file)

    df = normalize_csv(uploaded_file.data)

    return {
        "status": "success",
        "filename": uploaded_file.filename,
        "rows": len(df),
        "columns": df.columns
    }



    