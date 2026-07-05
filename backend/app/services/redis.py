import json
import logging
import redis
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

class RedisCacheClient:
    """Client for Upstash Redis result cache."""
    
    def __init__(self):
        """Initialize Redis connection using Upstash REST API."""
        self.client = None
        self.enabled = False
        
        try:
            if settings.UPSTASH_REDIS_URL:
                # Upstash uses Redis REST API via URL
                self.client = redis.from_url(
                    settings.UPSTASH_REDIS_URL,
                    decode_responses=True,
                )
                # Test connection
                self.client.ping()
                self.enabled = True
                logger.info("✅ Redis cache client initialized successfully")
            else:
                logger.warning("⚠️ Redis credentials not configured. Cache disabled.")
        except Exception as e:
            logger.warning(f"⚠️ Redis connection failed: {e}. Cache disabled.")
            self.client = None
            self.enabled = False
    
    def get(self, key: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve cached result from Redis.
        
        Args:
            key: Cache key (e.g., duckdb_hash_abc123)
            
        Returns:
            Dict with 'columns' and 'rows' if found, else None
        """
        if not self.enabled:
            return None
        
        try:
            data = self.client.get(key)
            if data:
                # Data is stored as JSON string
                result = json.loads(data)
                logger.info(f"✅ Redis cache HIT for key: {key[:20]}...")
                return result
            else:
                logger.debug(f"❌ Redis cache MISS for key: {key[:20]}...")
                return None
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode Redis value for key {key}: {e}")
            return None
        except Exception as e:
            logger.error(f"Redis GET failed: {e}")
            return None  # Fall back to DuckDB on error
    
    def set(self, key: str, value: Dict[str, Any], ttl: Optional[int] = None) -> bool:
        """
        Store result in Redis with TTL.
        
        Args:
            key: Cache key
            value: Dict with 'columns' and 'rows'
            ttl: Time to live in seconds (default from settings)
            
        Returns:
            True if stored successfully, False otherwise
        """
        if not self.enabled:
            return False
        
        if ttl is None:
            ttl = settings.REDIS_CACHE_TTL
        
        try:
            # Serialize to JSON
            data = json.dumps(value)
            # Store with TTL
            self.client.setex(key, ttl, data)
            logger.info(f"✅ Stored Redis cache for key: {key[:20]}... (TTL: {ttl}s)")
            return True
        except Exception as e:
            logger.error(f"Redis SET failed: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """
        Delete a specific cache entry.
        Useful for manual invalidation.
        """
        if not self.enabled:
            return False
        
        try:
            self.client.delete(key)
            logger.info(f"Deleted Redis key: {key[:20]}...")
            return True
        except Exception as e:
            logger.error(f"Redis DELETE failed: {e}")
            return False
    
    def clear_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching a pattern (use with caution).
        Example: clear_pattern("duckdb_hash_*")
        """
        if not self.enabled:
            return 0
        
        try:
            deleted = 0
            for key in self.client.scan_iter(match=pattern):
                self.client.delete(key)
                deleted += 1
            logger.info(f"Cleared {deleted} Redis keys matching pattern: {pattern}")
            return deleted
        except Exception as e:
            logger.error(f"Redis pattern clear failed: {e}")
            return 0

# Singleton instance
redis_cache = RedisCacheClient()