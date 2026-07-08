# ============================================
# STAGE 1: Builder
# ============================================

FROM python:3.11-slim AS builder

WORKDIR /app

# Install uv
RUN pip install --no-cache-dir uv

# Copy dependency file
COPY requirements.txt .

# Create virtual environment
RUN uv venv /opt/venv

# Install dependencies into the venv
RUN . /opt/venv/bin/activate && \
    uv pip install --no-cache -r requirements.txt

# ============================================
# STAGE 2: Runtime
# ============================================

FROM python:3.11-slim

WORKDIR /app

# Copy virtual environment
COPY --from=builder /opt/venv /opt/venv

ENV PATH="/opt/venv/bin:$PATH"

# Copy source code
COPY . .

# Entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create non-root user with a proper home directory
RUN addgroup --system --gid 1001 appuser && \
    adduser --system --uid 1001 --gid 1001 --home /app appuser && \
    chown -R appuser:appuser /app

# 👇 ADD THESE 3 LINES 👇
RUN mkdir -p /app/.duckdb && chown -R appuser:appuser /app
ENV HOME=/app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/docs', timeout=2)" || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]