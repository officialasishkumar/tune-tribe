# TuneTribe Backend

FastAPI backend for authentication, groups, friends, track ingestion, analytics, and multi-provider metadata resolution.

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
- `TUNETRIBE_METADATA_HTTP_TIMEOUT_SECONDS` controls outbound provider request timeout.
- `TUNETRIBE_METADATA_CACHE_TTL_SECONDS` controls how long resolved metadata stays reusable in the persistent cache.
- `TUNETRIBE_METADATA_MEMORY_CACHE_MAX_ENTRIES` controls the hot in-memory cache size per backend process.
- `TUNETRIBE_FORWARDED_ALLOW_IPS` should be left empty unless the app is behind a trusted reverse proxy.

## Track Metadata

Track URLs are resolved through a provider registry so new integrations can be added without changing the main API flow. The current backend supports Spotify, Apple Music, YouTube, YouTube Music, SoundCloud, Deezer, TIDAL, Bandcamp, Audiomack, and Amazon Music.

Resolved metadata is cached in two layers:

- An in-memory LRU-style TTL cache for fast repeated lookups in the same process.
- A database-backed cache table for reuse across requests and process restarts.

## Container Startup

The production image runs `python -m app.bootstrap` before starting Uvicorn so migrations happen once per container start.
