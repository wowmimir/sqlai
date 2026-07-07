from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.middleware import upload_size_middleware
from app.api.v1.datasets import router as datasets_router
from app.api.v1.projects import router as projects_router
from app.api.v1.query import router as query_router
from app.api.v1.chat import router as chat_router
from app.api.v1.cache import router as cache_router

import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(message)s")


from app.core.config import settings

app = FastAPI(title=settings.PROJECT_NAME)


# A simple list of domains we explicitly trust to talk to this API
origins = [
    "http://localhost:3000",  # Common Next.js/React dev port
    "http://localhost:5173",  # Vite default dev port
    "http://127.0.0.1:5173",
    "https://sqlai-xi.vercel.app",
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

app.include_router(
    projects_router,
    prefix="/api/v1",
)

app.include_router(
    query_router,
    prefix="/api/v1",
)

app.include_router(
    chat_router, 
    prefix="/api/v1"
)

app.include_router(
    cache_router, 
    prefix="/api/v1"
)


@app.get("/health")
def health_check():
    """
    Simple health check endpoint to verify the server is running.
    """
    return {"status": "healthy", "environment": settings.ENV}


