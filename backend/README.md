# TuneTribe Backend

FastAPI backend for authentication, groups, friends, track ingestion, and analytics.

## Run

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
uvicorn app.main:app --reload --port 8000
```

## Verify

```bash
./.venv/bin/ruff check app tests
./.venv/bin/pytest
./.venv/bin/python -m pip check
./.venv/bin/pip-audit
```

## Key Settings

- Local development defaults to SQLite.
- Production requires MySQL, a non-default `TUNETRIBE_SECRET_KEY` that is at least 32 characters long, and demo seeding disabled.
- `TUNETRIBE_AUTH_RATE_LIMIT_MAX_ATTEMPTS` and `TUNETRIBE_AUTH_RATE_LIMIT_WINDOW_SECONDS` control login throttling.
- `TUNETRIBE_FORWARDED_ALLOW_IPS` should be left empty unless the app is behind a trusted reverse proxy.

## Container Startup

The production image runs `python -m app.bootstrap` before starting Uvicorn so migrations happen once per container start.
