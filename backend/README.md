# TuneTribe Backend

FastAPI backend for authentication, groups, friends, track ingestion, and analytics.

## Run

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
uvicorn app.main:app --reload --port 8000
```

## Environment

Copy `.env.example` to `.env` if you want to override defaults.
If you do nothing, local development uses SQLite via the default `TUNETRIBE_DATABASE_URL`.
Production container builds use the locked package set from `requirements.lock`.

## Database

The backend schema is relational and is designed to run on MySQL in production. Alembic migrations are applied automatically on startup by default, and the most important query paths now have composite indexes for:

- group track feeds
- personal track history
- repeated-track analytics within a group

## Production behavior

- `TUNETRIBE_ENVIRONMENT=production` enables startup validation for secret keys, database choice, and demo seeding.
- `python -m app.bootstrap` runs migrations and optional seeding once before the web workers start.
- The production Docker image starts Uvicorn with `--workers ${TUNETRIBE_WEB_CONCURRENCY:-2}` and trusted proxy headers enabled.
