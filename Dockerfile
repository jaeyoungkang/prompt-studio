# Prompt Studio - Cloud Run Optimized Dockerfile
FROM python:3.11-slim

# Metadata
LABEL maintainer="Prompt Studio"
LABEL version="1.0.0"
LABEL description="Prompt Studio - Web-based prompt management system for Cloud Run"

# Environment variables for Cloud Run
ENV PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080 \
    PROMPT_STUDIO_API_KEY=prompt-studio-dev-key

# Working directory
WORKDIR /app

# Install system dependencies (minimal for Cloud Run)
RUN apt-get update && apt-get install -y \
    curl \
    --no-install-recommends && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY app.py models.py storage.py ./
COPY static/ ./static/
COPY templates/ ./templates/
COPY prompts/ ./prompts/

# Create additional directories for runtime
RUN mkdir -p /tmp/prompts-backup && \
    chmod 755 /tmp/prompts-backup

# Cloud Run runs as non-root by default, so no need to create user
# But ensure proper permissions
RUN chmod -R 755 /app && \
    chmod -R 777 /app/prompts

# Cloud Run uses PORT environment variable
EXPOSE $PORT

# Start command optimized for Cloud Run
CMD exec uvicorn app:app --host 0.0.0.0 --port $PORT --workers 1