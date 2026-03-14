FROM python:3.14-slim-bookworm@sha256:5404df00cf00e6e7273375f415651837b4d192ac6859c44d3b740888ac798c99

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    TUNETRIBE_ENVIRONMENT=production \
    TUNETRIBE_RUN_STARTUP_TASKS_ON_APP_START=false

WORKDIR /app

RUN addgroup --system tunetribe && adduser --system --ingroup tunetribe tunetribe

COPY pyproject.toml README.md alembic.ini ./
COPY requirements.lock ./
COPY start.sh ./
COPY alembic ./alembic
COPY app ./app

RUN pip install --upgrade pip \
    && pip install --constraint requirements.lock . \
    && chmod +x /app/start.sh

RUN chown -R tunetribe:tunetribe /app

USER tunetribe

EXPOSE 8000

CMD ["/app/start.sh"]
