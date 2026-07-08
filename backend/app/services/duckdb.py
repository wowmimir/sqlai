import logging
import duckdb
import os
from typing import Dict, List, Any
from duckdb import DuckDBPyConnection
from app.core.config import settings

logger = logging.getLogger(__name__)

_HTTPFS_LOADED = False


def _ensure_httpfs_loaded(conn: DuckDBPyConnection) -> None:
    """Load httpfs extension idempotently."""
    global _HTTPFS_LOADED
    if not _HTTPFS_LOADED:
        # 👇 ADD THESE 4 LINES 👇
        home_dir = os.environ.get('HOME', '/tmp')
        duckdb_dir = os.path.join(home_dir, '.duckdb')
        os.makedirs(duckdb_dir, exist_ok=True)
        conn.execute(f"SET home_directory = '{duckdb_dir}'")
        
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

    if endpoint_url.startswith("http://"):
        hostname = endpoint_url[7:]
    elif endpoint_url.startswith("https://"):
        hostname = endpoint_url[8:]
    else:
        hostname = endpoint_url

    hostname = hostname.rstrip("/")

    conn.execute(f"SET s3_endpoint='{hostname}'")
    conn.execute(f"SET s3_access_key_id='{settings.R2_ACCESS_KEY_ID}'")
    conn.execute(f"SET s3_secret_access_key='{settings.R2_SECRET_ACCESS_KEY}'")
    conn.execute("SET s3_region='auto'")
    conn.execute("SET s3_url_style='path'")

    if endpoint_url.startswith("https://"):
        conn.execute("SET s3_use_ssl=true")
    else:
        conn.execute("SET s3_use_ssl=false")

    logger.info("DuckDB S3 configuration applied.")


def execute_sql_with_duckdb(sql: str) -> Dict[str, Any]:
    """Execute a DuckDB SQL statement."""
    if not sql or not sql.strip():
        raise RuntimeError("Empty SQL statement provided.")

    conn = None
    try:
        conn = duckdb.connect(':memory:')
        _ensure_httpfs_loaded(conn)
        _configure_s3(conn)
        conn.execute("PRAGMA memory_limit='512MB';")

        logger.info(f"Executing DuckDB SQL (first 200 chars): {sql[:200]}...")
        result = conn.execute(sql)

        columns = [col[0] for col in result.description] if result.description else []
        rows_as_tuples = result.fetchall()
        rows = [dict(zip(columns, row)) for row in rows_as_tuples]

        logger.info(f"Query executed successfully. Columns: {len(columns)}, Rows: {len(rows)}")

        return {
            "columns": columns,
            "rows": rows
        }

    except duckdb.Error as e:
        error_msg = f"DuckDB execution error: {str(e)}"
        logger.error(error_msg)
        logger.error(f"Failing SQL: {sql[:500]}...")
        raise RuntimeError(error_msg) from e

    except Exception as e:
        error_msg = f"Unexpected error during DuckDB execution: {str(e)}"
        logger.error(error_msg)
        raise RuntimeError(error_msg) from e

    finally:
        if conn:
            conn.close()
            logger.debug("DuckDB connection closed.")


def execute_sql_with_duckdb_safe(sql: str) -> Dict[str, Any]:
    """Wrapper that catches all exceptions and returns an error dict."""
    try:
        return execute_sql_with_duckdb(sql)
    except Exception as e:
        return {"error": str(e)}