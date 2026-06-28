import logging
from botocore.client import Config
import boto3
from botocore.exceptions import ClientError


from app.core.config import settings

logger = logging.getLogger(__name__)

class StorageService:
    """
    Filing Cabinet Clerk managing Cloudflare R2 Object Storage.
    Uses standard boto3 clients offloaded to FastAPI's internal worker thread pool.
    """
    def __init__(self)->None:
        endpoint_url = settings.R2_ENDPOINT_URL or f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            config=Config(signature_version="s3v4"),
            region_name="auto",  # Cloudflare R2 relies on auto-routing regions
        )
        self.bucket_name = settings.R2_BUCKET_NAME

    @staticmethod

    def compile_path(project_id : str, dataset_id : str)-> str:
        """
        Enforces a clean multi-tenant layout inside the bucket.
        Output template: datasets/user_123/dataset_abc.parquet
        """
        return f"projects/{project_id}/datasets/{dataset_id}.parquet"
    
    def upload_file_bytes(self, file_bytes: bytes, project_id: str, dataset_id: str, content_type: str = "application/octet-stream") -> str:
        """
        Uploads raw file byte content into the multi-tenant sandbox location.
        Returns the computed file object key path.
        """
        object_key = self.compile_path(project_id, dataset_id)
        try:
            self.client.put_object(
                Bucket=self.bucket_name,
                Key=object_key,
                Body=file_bytes,
                ContentType=content_type,
            )
            logger.info(f"Successfully uploaded asset target to storage path: {object_key}")
            return object_key
        except ClientError as e:
            logger.error(f"Failed to save asset object to Cloudflare R2 path ({object_key}): {e}")
            raise RuntimeError("Internal object storage interface failure.")


    def generate_presigned_url(self, project_id: str, dataset_id: str, expires_in_seconds: int = 3600) -> str:
        """
        Generates a temporary, secure access link for reading files safely.
        Defaults to an expiration limit of 1 hour (3600s).
        """
        object_key = self.compile_path(project_id, dataset_id)
        try:
            url = self.client.generate_presigned_url(
                "get_object",
                Params={
                    'Bucket': self.bucket_name, 
                    "Key": object_key
                },
                ExpiresIn=expires_in_seconds,
            )
            return url
        except ClientError as e:
            logger.error(f"Failed to compile signature URL for object location ({object_key}): {e}")
            raise RuntimeError("Internal signature link construction failure.") from e


storageClient = StorageService()