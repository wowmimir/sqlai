from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.middleware import upload_size_middleware
from app.api.v1.datasets import router as datasets_router

from app.core.config import settings

app = FastAPI(title=settings.PROJECT_NAME)


# A simple list of domains we explicitly trust to talk to this API
origins = [
    "http://localhost:3000",  # Common Next.js/React dev port
    "http://localhost:5173",  # Vite default dev port
    "http://127.0.0.1:5173",
]


app.middleware("http")(upload_size_middleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,             # Who can talk to us?
    allow_credentials=True,            # Can they send auth cookies/headers?
    allow_methods=["*"],               # Which HTTP methods? (GET, POST, OPTIONS, etc.) ["*"] means all.
    allow_headers=["*"],               # Which custom headers can they send?
)

app.include_router(
    datasets_router,
    prefix="/api/v1",
)


@app.get("/health")
def health_check():
    """
    Simple health check endpoint to verify the server is running.
    """
    return {"status": "healthy", "environment": settings.ENV}


