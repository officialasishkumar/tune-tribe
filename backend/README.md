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
