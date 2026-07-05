import logging
import duckdb
from typing import Dict, List, Any
from duckdb import DuckDBPyConnection
from app.core.config import settings

logger = logging.getLogger(__name__)

# Module-level flag to ensure httpfs is loaded once
_HTTPFS_LOADED = False


def _ensure_httpfs_loaded(conn: DuckDBPyConnection) -> None:
    """Load httpfs extension idempotently."""
    global _HTTPFS_LOADED
    if not _HTTPFS_LOADED:
        try:
            conn.execute("INSTALL httpfs;")
            conn.execute("LOAD httpfs;")
            _HTTPFS_LOADED = True
            logger.info("DuckDB httpfs extension loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load DuckDB httpfs extension: {e}")
            raise RuntimeError("DuckDB httpfs extension could not be loaded.") from e


def _configure_s3(conn: DuckDBPyConnection) -> None:
    """Configure DuckDB to use S3-compatible storage (Cloudflare R2)."""
    endpoint_url = settings.R2_ENDPOINT_URL or f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

    # Extract hostname without protocol
    if endpoint_url.startswith("http://"):
        hostname = endpoint_url[7:]
    elif endpoint_url.startswith("https://"):
        hostname = endpoint_url[8:]
    else:
        hostname = endpoint_url

    # Remove trailing slash if present
    hostname = hostname.rstrip("/")

    conn.execute(f"SET s3_endpoint='{hostname}'")
    conn.execute(f"SET s3_access_key_id='{settings.R2_ACCESS_KEY_ID}'")
    conn.execute(f"SET s3_secret_access_key='{settings.R2_SECRET_ACCESS_KEY}'")
    conn.execute("SET s3_region='auto'")
    conn.execute("SET s3_url_style='path'")

    # Explicitly set SSL based on the original URL's scheme
    if endpoint_url.startswith("https://"):
        conn.execute("SET s3_use_ssl=true")
    else:
        conn.execute("SET s3_use_ssl=false")

    logger.info("DuckDB S3 configuration applied.")

def execute_sql_with_duckdb(sql: str) -> Dict[str, Any]:
    """
    Execute a DuckDB SQL statement (with read_parquet() calls using presigned URLs)
    and return results as a JSON-serializable dict.

    Args:
        sql: The full SQL string to execute.

    Returns:
        Dict with 'columns' (list of str) and 'rows' (list of dict).

    Raises:
        RuntimeError: If DuckDB execution fails.
    """
    if not sql or not sql.strip():
        raise RuntimeError("Empty SQL statement provided.")

    conn = None
    try:
        # Create an in-memory DuckDB connection
        conn = duckdb.connect(':memory:')

        # Ensure httpfs is loaded for reading from HTTPS URLs
        _ensure_httpfs_loaded(conn)

        _configure_s3(conn)

        # Optional: Set memory limit to 512MB as a safeguard
        conn.execute("PRAGMA memory_limit='512MB';")

        # Log the SQL being executed (truncated for safety)
        logger.info(f"Executing DuckDB SQL (first 200 chars): {sql[:200]}...")

        # Execute the query
        result = conn.execute(sql)

        # Extract column names
        columns = [col[0] for col in result.description] if result.description else []

        # Fetch all rows as tuples
        rows_as_tuples = result.fetchall()

        # Convert rows to list of dicts
        rows = [dict(zip(columns, row)) for row in rows_as_tuples]

        logger.info(f"Query executed successfully. Columns: {len(columns)}, Rows: {len(rows)}")

        return {
            "columns": columns,
            "rows": rows
        }

    except duckdb.Error as e:
        # Catch all DuckDB-specific errors
        error_msg = f"DuckDB execution error: {str(e)}"
        logger.error(error_msg)
        logger.error(f"Failing SQL: {sql[:500]}...")
        raise RuntimeError(error_msg) from e

    except Exception as e:
        # Catch any unexpected errors
        error_msg = f"Unexpected error during DuckDB execution: {str(e)}"
        logger.error(error_msg)
        raise RuntimeError(error_msg) from e

    finally:
        # Ensure connection is closed even if an error occurs
        if conn:
            conn.close()
            logger.debug("DuckDB connection closed.")


def execute_sql_with_duckdb_safe(sql: str) -> Dict[str, Any]:
    """
    Wrapper that catches all exceptions and returns a dict with an 'error' field
    instead of raising. Useful for API endpoints that want to handle errors gracefully.

    Returns:
        Dict with either 'columns'/'rows' on success, or {'error': str} on failure.
    """
    try:
        return execute_sql_with_duckdb(sql)
    except Exception as e:
        return {"error": str(e)}