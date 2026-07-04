from sqlalchemy.orm import Session
from app.database.models import Dataset
import re
import json
import requests
import sqlglot
from typing import Dict,Any
from sqlglot import exp
from app.services.duckdb import execute_sql_with_duckdb 
import logging


logger = logging.getLogger(__name__)



OLLAMA_URL = "http://localhost:11434/api/generate"

_MUTATING_NODE_TYPES = (
    exp.Insert,
    exp.Update,
    exp.Delete,
    exp.Merge,
    exp.Create,
    exp.Drop,
    exp.Alter,
    exp.TruncateTable,
)

class UnsafeSQLError(RuntimeError):
    """Raised when the LLM produces SQL that fails structural validation."""

class OllamaError(RuntimeError):
    """Base exception for Ollama‑related problems."""


class OllamaTimeoutError(OllamaError):
    """Raised when the request to Ollama times out."""


class OllamaConnectionError(OllamaError):
    """Raised when Ollama cannot be reached (connection refused, DNS failure, etc.)."""


class OllamaResponseError(OllamaError):
    """Raised when Ollama returns an unexpected or malformed payload."""

def sanitize_table_name(display_name: str) -> str:

    if not display_name:
        return 'table'
    # 1. Lower‑case 
    s = display_name.lower()

    # 2. Replace spaces and hyphens with underscores
    s = re.sub(r'[-\s]', '_', s)

    # 3. Keep only alphanumerics and underscore
    s = re.sub(r'[^a-z0-9_]', '', s)

    # 4. Prevent leading digit
    if s and s[0].isdigit():
        s = '_' + s

    # 5. Fallback for empty strings
    if not s:
        s = 'table'

    return s



def get_project_schemas(db: Session, project_id: str, clerk_user_id: str) -> list[dict]:
    
    dataset_schemas = db.query(Dataset).filter(
        Dataset.project_id == project_id, 
        Dataset.clerk_user_id == clerk_user_id
    ).order_by(Dataset.created_at).all()
    

    return [
        {
            "dataset_id": str(d.id),
            "display_name": d.display_name,
            "storage_key": d.storage_key,
            "row_count": d.row_count,
            "schema_metadata": d.schema_metadata or {},
            "logical_name" : sanitize_table_name(d.display_name)
        }
        for d in dataset_schemas
    ]


def build_prompt(user_prompt: str, schemas: list[dict]) -> str:

    # --- Section A: System Role & Hard Rules ---
    system_rules = """You are a SQL query compiler for DuckDB.
Your sole task is to translate the user's natural language question into a single valid DuckDB SELECT statement.

STRICT RULES — violations are unacceptable:
1. Output exactly ONE statement, and it MUST be a SELECT. No exceptions.
2. Never emit DDL (CREATE, DROP, ALTER, TRUNCATE, RENAME) or DML (INSERT, UPDATE, DELETE, MERGE).
3. Never emit comments, markdown fences, explanations, or preamble text.
4. Only reference tables and columns explicitly listed in the schema catalog below.
5. Only perform joins when the user explicitly mentions a relationship between tables, OR when two tables share an obviously matching column name (e.g., a column called user_id appearing in both). Otherwise, query a single table.
6. If the question cannot be answered using only the provided schema, output exactly the string UNANSWERABLE and nothing else.
7. Qualify ambiguous column names with their table name (e.g., table.column) to prevent ambiguity.
8. Identifiers that begin with a digit (e.g., 2017_budgets) MUST be wrapped in double quotes (e.g., \"2017_budgets\"). DuckDB rejects unquoted numeric-leading identifiers.
"""

    interpreting_rules = """INTERPRETATION GUIDANCE:
- When the user asks "what was the X for Y", interpret this as: retrieve the value(s) of the column(s) most closely matching X, filtered by the entity Y mentioned in the WHERE clause.
- Column names are pre-normalized (lowercased, underscores instead of spaces). Match the user's intent to the closest column name — don't echo the user's literal phrasing as a column reference.
- When the user references a value (e.g., "product 8"), match it against string columns case-insensitively. Use LOWER() if needed for safe matching.
- Prefer selecting the value column directly over selecting the entire row unless the user asks for "all" or "everything"."""

    # --- Section B: Schema Catalog ---
    schema_text = ""
    for s in schemas:
        schema_text += f"Table: {s['logical_name']}\n"
        schema_text += f"Source: {s['display_name']}\n"
        schema_text += f"Rows: {s['row_count']}\n"
        schema_text += "Columns:\n"
        for col, dtype in s['schema_metadata'].items():
            schema_text += f"  - {col} ({dtype})\n"
        schema_text += "\n"
    
    if not schema_text:
        schema_text += "No tables available in this project."

    # --- Section C: Engine Notes ---
    engine_notes = """DUCKDB NOTES:
- Use || for string concatenation.
- Date/time columns are pre-normalized to ISO format.
- Null values have been replaced with 0 in numeric columns and empty strings in text columns."""

    # --- Section D: Question + Output Contract ---
    output_directive = f"""USER QUESTION:
{user_prompt}

OUTPUT CONTRACT:
Respond with ONLY the raw SQL string. No markdown fences. No explanation. No preamble.
If the question is unanswerable with the provided schema, respond with exactly: UNANSWERABLE
A valid SELECT response ends with a single semicolon. UNANSWERABLE must have no trailing characters."""

# --- Assemble ---
    return f"""{system_rules}

{schema_text}

{interpreting_rules}

{engine_notes}

{output_directive}"""


def generate_sql(prompt: str, model: str = "nemotron-3-super:cloud", timeout: int = 120) -> str:

    logger.info(f"Generating SQL with model '{model}', prompt length: {len(prompt)} chars")
    
    # Optional: log the first 500 chars of prompt for debugging
    logger.debug(f"Prompt preview: {prompt[:500]}...")

    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
    }

    try:
        resp = requests.post(OLLAMA_URL, json=payload, timeout=timeout)
        # Raise for HTTP errors (4xx, 5xx)
        resp.raise_for_status()
    except requests.exceptions.Timeout as exc:
        raise OllamaTimeoutError(
            f"Ollama request timed out after {timeout}s. "
            f"Check that the model '{model}' is loaded or increase the timeout."
        ) from exc
    except requests.exceptions.ConnectionError as exc:
        raise OllamaConnectionError(
            f"Unable to connect to Ollama at {OLLAMA_URL}. "
            f"Make sure the Ollama server is running and reachable."
        ) from exc
    except requests.exceptions.RequestException as exc:  # catches other requests errors
        raise OllamaError(f"HTTP request to Ollama failed: {exc}") from exc

    # ------------------------------------------------------------------
    # Parse JSON payload
    # ------------------------------------------------------------------
    try:
        data = resp.json()
    except json.JSONDecodeError as exc:
        logger.error(f"Ollama returned non-JSON: {resp.text[:500]}")
        raise OllamaResponseError(
            f"Ollama returned non‑JSON response (status {resp.status_code}): {resp.text[:200]}"
        ) from exc

    # Ollama's generate endpoint should contain a "response" key with the generated text.
    if "response" not in data:
        logger.error(f"Ollama response missing 'response' field: {data}")
        raise OllamaResponseError(
            f"Unexpected Ollama payload missing 'response' field: {data}"
        )

    raw_response = data["response"]
    logger.info(f"Raw LLM response length: {len(raw_response)} chars")
    logger.debug(f"Raw LLM response: {raw_response[:500]}...")
    
    return raw_response

def strip_markdown_fences(raw: str) -> str:
    """
    Remove leading/trailing markdown code fences from LLM output.
    Handles ```sql ... ``` and bare ``` ... ``` variants.
    """
    s = raw.strip()

    # Strip leading fence: ```sql or ``` (possibly followed by newline)
    if s.startswith("```"):
        # Drop the opening fence line
        first_newline = s.find("\n")
        if first_newline != -1:
            s = s[first_newline + 1 :]
        else:
            s = ""

    # Strip trailing fence
    if s.endswith("```"):
        s = s[: -3]

    return s.strip()


def validate_sql(raw_sql: str) -> tuple[bool, exp.Expression | None, str | None]:
    """
    Returns (is_unanswerable, parsed_tree, error_message).
    Exactly one of parsed_tree or error_message is non-None when is_unanswerable is False.
    """
    if raw_sql is None:
        logger.error("LLM returned None")
        return (False, None, "LLM returned no SQL output.")

    cleaned = strip_markdown_fences(raw_sql).strip()
    logger.info(f"Cleaned SQL (first 200 chars): {cleaned[:200]}...")

    if not cleaned:
        logger.error("LLM returned empty SQL after stripping fences")
        return (False, None, "LLM returned empty SQL output.")

    if cleaned.upper() == "UNANSWERABLE":
        return (True, None, None)

    try:
        statements = sqlglot.parse(cleaned, dialect="duckdb")
    except sqlglot.errors.ParseError as e:
        return (False, None, f"SQL parse error: {e}")

    if not statements:
        return (False, None, "SQL could not be parsed.")

    if len(statements) > 1:
        return (False, None, "Multiple SQL statements detected. Only a single SELECT is allowed.")

    tree = statements[0]
    if tree is None:
        return (False, None, "SQL parsed to an empty expression.")

    for node in tree.walk():
        if isinstance(node, _MUTATING_NODE_TYPES):
            return (False, None, f"Mutating operation detected: {type(node).__name__}.")
        if isinstance(node, exp.Identifier):
            name = node.name
            if name and name[0].isdigit() and not node.args.get("quoted"):
                node.set("quoted", True)

    if not isinstance(tree, exp.Select):
        return (False, None, f"Root expression is {type(tree).__name__}, not SELECT.")

    return (False, tree, None)


def enforce_row_limit(ast: exp.Select) -> exp.Select:
    """
    Ensures the AST has a LIMIT of 250 or less.
    """
    if ast.args.get('limit'):
        current_limit = ast.args['limit'].args.get('expression')
        
        if isinstance(current_limit, exp.Literal) and current_limit.is_number:
            limit_value = int(current_limit.name)
            if limit_value > 250:
                # Modify in place to avoid creating a new object
                ast.limit(250, copy=False)
        # If limit <= 250 or not a literal, keep as is
        return ast
    else:
        # No limit exists, add one (copy=True by default)
        return ast.limit(250)

def substitute_table_paths(ast: exp.Expression, mapping: Dict[str, str]) -> exp.Expression:
    """
    Replace every table identifier with read_parquet(url) AS alias
    so that column references like table.column resolve correctly.
    """
    import logging
    logger = logging.getLogger(__name__)
    replaced_tables = []
    
    def replace_table(node):
        if isinstance(node, exp.Table):
            table_name = node.this.name
            lookup_key = table_name.lower()
            if lookup_key not in mapping:
                raise ValueError(f"Unknown table '{table_name}'")
            
            url = mapping[lookup_key]
            url_literal = exp.Literal.string(url)
            
            # Build read_parquet function call
            func_node = exp.func('read_parquet', url_literal)
            
            # Determine alias
            # If the table already had an alias, use that alias's name.
            # Otherwise, use the table name itself.
            if node.alias:
                # node.alias is a TableAlias; extract its identifier
                alias_identifier = node.alias.this if hasattr(node.alias, 'this') else node.alias
            else:
                alias_identifier = exp.Identifier(this=node.this.name, quoted=node.this.quoted)
            
            # Attach alias using .as_() – this returns an Alias expression
            aliased_node = func_node.as_(alias_identifier)
            replaced_tables.append(table_name)
            return aliased_node
        return node
    
    transformed = ast.transform(replace_table)
    if replaced_tables:
        logger.info(f"Replaced tables in SQL: {', '.join(replaced_tables)}")
    return transformed


def compile_and_execute_query(
    user_prompt: str,
    project_id: str,
    clerk_user_id: str,
    db: Session,
    model: str = "gemma4:31b-cloud",
) -> Dict[str, Any]:
    """
    Complete end-to-end query pipeline:
    1. Fetch project schemas
    2. Generate SQL via LLM
    3. Validate and secure SQL
    4. Substitute table paths with presigned URLs
    5. Enforce row limits
    6. Execute with DuckDB
    7. Return results

    Returns:
        Dict with 'columns' and 'rows' on success.
        May raise HTTPException-compatible errors.
    """
    # 1. Fetch schemas for the project

    logger.info(f"Starting query compilation for project {project_id}, prompt: {user_prompt[:100]}...")
    schemas = get_project_schemas(db, project_id, clerk_user_id)
    logger.info(f"Found {len(schemas)} datasets in project")

    if not schemas:
        raise ValueError("No datasets in this project.")

    # 2. Build prompt and get raw SQL from LLM
    final_prompt = build_prompt(user_prompt, schemas)
    logger.info(f"Built prompt (length: {len(final_prompt)} chars)")
    final_sql = generate_sql(final_prompt, model=model)

    # 3. Validate SQL → get AST tree
    is_unanswerable, tree, err = validate_sql(final_sql)
    if err:
        raise ValueError(err)
    if is_unanswerable:
        raise ValueError("Question cannot be answered with the available data.")

    # 4. Enforce row limit
    tree = enforce_row_limit(tree)

    # 5. Build mapping: logical_name → pre‑signed URL
    #    (import storageClient at top if not already imported)
    from app.services.storage import storageClient
    from app.core.config import settings

    mapping = {}
    for s in schemas:
        url = storageClient.generate_presigned_url(
            project_id=project_id,
            dataset_id=s['dataset_id'],
            expires_in_seconds=900  # 15 minutes
        )
        mapping[s['logical_name']] = url

    # 6. Substitute table paths with read_parquet() calls
    try:
        transformed_ast = substitute_table_paths(tree, mapping)
    except ValueError as e:
        raise ValueError(f"Table substitution failed: {str(e)}")

    # 7. Render final executable SQL
    final_executable_sql = transformed_ast.sql()

    # Log the final SQL (truncated for safety)
    logger.info(f"Executable SQL generated (length: {len(final_executable_sql)} chars)")

    # 8. Execute with DuckDB
    try:
        result = execute_sql_with_duckdb(final_executable_sql)
        return result
    except RuntimeError as e:
        raise RuntimeError(f"DuckDB execution failed: {str(e)}")

