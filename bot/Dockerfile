# === STAGE 1: Builder ===
FROM python:3.11-slim as builder

WORKDIR /app

# Instalar dependencias de sistema
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc && \
    rm -rf /var/lib/apt/lists/*

# Copiar archivos de dependencias
COPY pyproject.toml poetry.lock* ./

# Instalar Poetry y dependencias
RUN pip install --no-cache-dir poetry==1.7.1 && \
    poetry config virtualenvs.in-project true && \
    poetry install --only main --no-interaction --no-ansi

# === STAGE 2: Runtime ===
FROM python:3.11-slim

WORKDIR /app

# Crear usuario no-root
RUN groupadd -r botuser && \
    useradd -r -g botuser -u 1000 botuser && \
    chown -R botuser:botuser /app

# Copiar virtualenv desde builder
COPY --from=builder --chown=botuser:botuser /app/.venv /app/.venv

# Copiar código del bot
COPY --chown=botuser:botuser ./src /app/src

# Configurar PATH
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

# Cambiar a usuario no-root
USER botuser

# Comando de inicio
CMD ["python", "-m", "src.bot.main"]
