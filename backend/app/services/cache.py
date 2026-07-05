import logging
from typing import List, Optional, Tuple, Dict, Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.embedding import get_embedding


import hashlib
from app.services.redis import redis_cache

logger = logging.getLogger(__name__)


def lookup_semantic_cache(
    clerk_user_id: str,
    project_id: str,
    prompt: str,
    db: Session,
    threshold: float | None = None,
) -> Optional[Tuple[str, List[str], float]]:
    """
    Look up a semantically similar prompt in the cache.

    Returns:
        (compiled_sql_query, selected_tables, cosine_distance)
        or None if no suitable match exists.
    """

    if threshold is None:
        threshold = settings.CACHE_SIMILARITY_THRESHOLD

    try:
        # Generate embedding
        embedding = get_embedding(prompt)

        # Convert to pgvector literal
        embedding_str = "[" + ",".join(map(str, embedding)) + "]"

        query = text("""
    SELECT
        compiled_sql_query,
        selected_tables,
        schema_snapshot,
        prompt_embedding <=> CAST(:embedding AS vector) AS distance
    FROM semantic_prompt_cache
    WHERE clerk_user_id = :user_id
      AND project_id = :project_id
    ORDER BY distance ASC
    LIMIT 1;
""")

        result = db.execute(
            query,
            {
                "embedding": embedding_str,
                "user_id": clerk_user_id,
                "project_id": project_id,
            },
        ).first()

        if result is None:
            logger.debug("No semantic cache entries found.")
            return None

        if result.distance <= threshold:
            logger.info(
                "Semantic cache HIT (distance = %.4f)",
                result.distance,
            )
            return (
                result.compiled_sql_query,
                result.selected_tables,
                result.distance,
                result.schema_snapshot
            )

        logger.debug(
            "Semantic cache MISS (distance %.4f > %.4f)",
            result.distance,
            threshold,
        )
        return None

    except Exception:
        logger.exception("Semantic cache lookup failed")
        return None




logger = logging.getLogger(__name__)

def generate_cache_key(final_sql: str) -> str:
    """
    Generate deterministic cache key from final executable SQL.
    
    Args:
        final_sql: Executable SQL with full S3 paths
        
    Returns:
        Cache key: duckdb_hash_{sha256_hash}
    """
    # Hash the SQL
    sql_hash = hashlib.sha256(final_sql.encode('utf-8')).hexdigest()
    return f"duckdb_hash_{sql_hash}"

def get_cached_result(final_sql: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve cached result from Redis using the SQL hash as key.
    
    Args:
        final_sql: Executable SQL string
        
    Returns:
        Dict with 'columns' and 'rows' if cached, else None
    """
    key = generate_cache_key(final_sql)
    return redis_cache.get(key)

def store_result_cache(final_sql: str, result: Dict[str, Any]) -> bool:
    """
    Store query result in Redis cache.
    
    Args:
        final_sql: Executable SQL string
        result: Dict with 'columns' and 'rows'
        
    Returns:
        True if stored successfully, False otherwise
    """
    key = generate_cache_key(final_sql)
    return redis_cache.set(key, result)

def invalidate_cache_for_dataset(dataset_id: str) -> int:
    """
    Invalidate all cache entries for a specific dataset.
    (Future enhancement when dataset is deleted)
    """
    # Since we can't easily find keys by dataset, we'd need to store mapping
    # For now, this is a placeholder
    logger.warning("Dataset-specific cache invalidation not implemented")
    return 0