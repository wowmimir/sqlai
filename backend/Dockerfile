# ============================================
# STAGE 1: Builder
# ============================================
FROM python:3.11-slim AS builder

# Set working directory
WORKDIR /app

# Install UV - fast Python package installer
RUN pip install --no-cache-dir uv

# Copy only requirements first (for caching)
COPY requirements.txt .

# Create virtual environment and install dependencies
# --no-cache: don't save pip cache
# --frozen: use exact versions from requirements.txt
RUN uv venv /opt/venv && \
    . /opt/venv/bin/activate && \
    uv pip install --no-cache -r requirements.txt

# ============================================
# STAGE 2: Runtime
# ============================================
FROM python:3.11-slim AS runtime

# Set working directory
WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Add venv to PATH
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY . .

# Copy and setup entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create non-root user for security
RUN addgroup --system --gid 1001 appuser && \
    adduser --system --uid 1001 --gid 1001 appuser && \
    chown -R appuser:appuser /app

USER appuser

# Expose the port
EXPOSE 8000

# Health check (optional - helps Render know container is ready)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/docs', timeout=2)" || exit 1

# Entrypoint runs migrations, then starts the app
ENTRYPOINT ["/docker-entrypoint.sh"]

# Default command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]