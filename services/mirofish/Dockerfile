FROM python:3.11-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY backend/pyproject.toml ./
RUN pip install --no-cache-dir -e ".[prod]" 2>/dev/null || pip install --no-cache-dir -e .

COPY backend/ .

# Copy routing config
COPY config/ ./config/

EXPOSE 8000

ENV PYTHONUNBUFFERED=1
ENV LLM_GATEWAY_MODE=live

CMD ["python", "-m", "gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120", "app:create_app()"]