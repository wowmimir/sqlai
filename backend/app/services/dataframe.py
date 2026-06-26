import io
import re
import polars as pl


def _normalize_column_name(name: str) -> str:
    """
    Converts column names into snake_case safe identifiers.
    """
    name = name.strip().lower()
    name = re.sub(r"[^\w\s]", "", name)      # remove special chars
    name = re.sub(r"\s+", "_", name)         # spaces → underscore
    return name

def _normalize_column_names(df: pl.DataFrame) -> pl.DataFrame:
    return df.rename(
        {col: _normalize_column_name(col) for col in df.columns}
    )


def _trim_string_columns(df: pl.DataFrame) -> pl.DataFrame:
    """
    Trim whitespace only for string columns.
    """
    exprs = []

    for col, dtype in df.schema.items():
        if dtype == pl.Utf8:
            exprs.append(pl.col(col).str.strip_chars())
        else:
            exprs.append(pl.col(col))

    return df.with_columns(exprs)


def _fill_nulls(df: pl.DataFrame) -> pl.DataFrame:
    """
    Fill nulls intelligently:
    - numeric → 0
    - strings → ""
    """
    exprs = []

    for col, dtype in df.schema.items():
        if dtype in [pl.Int64, pl.Int32, pl.Float64, pl.Float32]:
            exprs.append(pl.col(col).fill_null(0))
        elif dtype == pl.Utf8:
            exprs.append(pl.col(col).fill_null(""))
        else:
            exprs.append(pl.col(col))

    return df.with_columns(exprs)


def normalize_csv(file_bytes: bytes) -> pl.DataFrame:
    """
    Feature 1.3: In-memory normalization pipeline.

    Input:
        raw CSV bytes from UploadFile

    Output:
        cleaned Polars DataFrame
    """

    # 1. Load CSV from memory
    buffer = io.BytesIO(file_bytes)

    df = pl.read_csv(
        buffer,
        separator=';',           # Use semicolon as delimiter
        quote_char='"',          # Double quotes are used for quoting
        has_header=True,         # Assuming first row has headers
        infer_schema_length=10000,  # Increase schema inference length
        ignore_errors=False,     # Don't ignore errors (can set to True if needed)
    )

    # 2. Normalize schema
    df = _normalize_column_names(df)

    # 3. Trim strings
    df = _trim_string_columns(df)

    # 4. Fill nulls safely
    df = _fill_nulls(df)

    return df