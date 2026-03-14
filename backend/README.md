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

## Database

The backend schema is relational and is designed to run on MySQL in production. Alembic migrations are applied automatically on startup by default, and the most important query paths now have composite indexes for:

- group track feeds
- personal track history
- repeated-track analytics within a group
