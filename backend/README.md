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
- `TUNETRIBE_REDIS_URL` enables shared Redis or Valkey-compatible caching and distributed rate limiting.
- `TUNETRIBE_ANALYTICS_CACHE_TTL_SECONDS` controls group and personal analytics cache freshness.
- `TUNETRIBE_GLOBAL_STATS_CACHE_TTL_SECONDS` controls the public stats cache freshness.
- `TUNETRIBE_FORWARDED_ALLOW_IPS` should be left empty unless the app is behind a trusted reverse proxy.

## Track Metadata

Track URLs are resolved through a provider registry so new integrations can be added without changing the main API flow. The current backend supports Spotify, Apple Music, YouTube, YouTube Music, SoundCloud, Deezer, TIDAL, Bandcamp, Audiomack, and Amazon Music.

Resolved metadata is cached in two layers:

- An in-memory LRU-style TTL cache for fast repeated lookups in the same process.
- A shared Redis/Valkey cache when `TUNETRIBE_REDIS_URL` is configured.
- A database-backed cache table for reuse across requests and process restarts.

Analytics responses and `/api/stats` are also cached through the shared cache and invalidated on writes that change those results. Login and friend lookup throttles also use the shared cache in production, which avoids per-process rate-limit gaps on multi-instance deploys.

## Production Cache Setup

Set these in production:

```env
TUNETRIBE_REDIS_URL=rediss://default:<password>@<host>:<port>/0
TUNETRIBE_METADATA_CACHE_TTL_SECONDS=86400
TUNETRIBE_METADATA_MEMORY_CACHE_MAX_ENTRIES=2048
TUNETRIBE_ANALYTICS_CACHE_TTL_SECONDS=120
TUNETRIBE_GLOBAL_STATS_CACHE_TTL_SECONDS=300
```

Render notes:

- Use a Render Key Value service or another Redis/Valkey-compatible provider.
- Put the backend and cache in the same region.
- Use the internal cache URL when both services are on Render.
- Use `rediss://...` for external managed cache providers.

Vercel note:

- The frontend only needs `VITE_API_BASE_URL` pointing at the backend. The Redis URL stays on the backend service.

## Container Startup

The production image runs `python -m app.bootstrap` before starting Uvicorn so migrations happen once per container start.
