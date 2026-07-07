from fastapi import APIRouter, Depends, HTTPException
from app.services.redis import redis_cache
from app.core.security import get_current_user

router = APIRouter(prefix="/cache", tags=["Cache"])

@router.get("/retrieve")
def retrieve_cache(
    key: str,
    user: dict = Depends(get_current_user)
):
    """
    Retrieve cached query result by its deterministic hash key.
    Returns the full JSON matrix (columns + rows).
    """
    result = redis_cache.get(key)
    if result is None:
        raise HTTPException(status_code=404, detail="Cache key not found or expired.")
    
    return result