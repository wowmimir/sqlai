from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.config import settings



async def upload_size_middleware(request: Request, call_next):
    """
    Reject requests whose Content-Length exceeds the configured upload limit.

    This provides an early rejection before FastAPI begins processing
    the multipart request body.
    """

    if (
        request.method == "POST"
        and request.url.path == "/api/v1/datasets/upload"
    ):
        content_length = request.headers.get("content-length")

        if content_length is not None:
            try:
                if int(content_length) > settings.MAX_UPLOAD_SIZE_BYTES:
                    return JSONResponse(
                        status_code = 413,
                        content={
                            "detail":(
                                f"Maximum upload size is {settings.MAX_UPLOAD_SIZE_MB}"
                            )
                        }
                    )
            except ValueError:
                # Ignore malformed Content-Length.
                pass

    return await call_next(request)
            

