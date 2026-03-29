# TuneTribe

TuneTribe is a two-part workspace:

- `frontend/`: React + Vite client
- `backend/`: FastAPI API for auth, friends, groups, tracks, analytics, multi-provider metadata ingestion, and caching

## Quick Start

Frontend:

```bash
npm --prefix frontend ci
npm run dev:frontend
```

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
uvicorn app.main:app --reload --port 8000
```

The frontend proxies `/api` to `http://127.0.0.1:8000` in development.
The backend uses SQLite by default for local work.
The production baseline in this repo is MySQL 8.4 via `compose.yaml`.

Supported track links currently include Spotify, Apple Music, YouTube, YouTube Music, SoundCloud, Deezer, TIDAL, Bandcamp, Audiomack, and Amazon Music. The backend resolves metadata through a provider registry and caches resolved tracks to reduce upstream rate-limit pressure.

## Verification

Frontend:

```bash
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend test -- --run
npm --prefix frontend run build
npm --prefix frontend audit --omit=dev --audit-level=high
```

Backend:

```bash
cd backend
./.venv/bin/ruff check app tests
./.venv/bin/pytest
./.venv/bin/python -m pip check
./.venv/bin/pip-audit
```

## Security And Production

- Set `TUNETRIBE_SECRET_KEY` to a strong secret that is at least 32 characters long.
- Set `TUNETRIBE_ALLOWED_HOSTS` and `TUNETRIBE_CORS_ORIGINS` for the domains you actually serve.
- Keep `TUNETRIBE_SEED_DEMO_DATA=false` in production.
- Configure `TUNETRIBE_REDIS_URL` to a Redis or Valkey-compatible service in production so rate limits and shared caches work across instances.
- Tune `TUNETRIBE_METADATA_HTTP_TIMEOUT_SECONDS`, `TUNETRIBE_METADATA_CACHE_TTL_SECONDS`, `TUNETRIBE_METADATA_MEMORY_CACHE_MAX_ENTRIES`, `TUNETRIBE_ANALYTICS_CACHE_TTL_SECONDS`, and `TUNETRIBE_GLOBAL_STATS_CACHE_TTL_SECONDS` to match traffic and freshness requirements.
- Only set `TUNETRIBE_FORWARDED_ALLOW_IPS` if the backend is behind a trusted reverse proxy.
- Login attempts are rate-limited, JWTs now carry issuer and token-type claims, API responses send defensive security headers, and user-supplied avatar/music URLs are validated more strictly.

## Caching

The app now uses multiple cache layers:

- Track metadata: in-process LRU cache, shared Redis/Valkey cache, and database-backed persistent cache.
- Analytics and public stats: shared Redis/Valkey cache with write-time invalidation.
- Login and friend-lookup throttling: shared rate-limit counters when `TUNETRIBE_REDIS_URL` is configured, local memory fallback otherwise.
- Frontend API reads: React Query caches responses in the browser to cut duplicate requests during navigation.

## Cache Setup

Recommended production topology:

1. Run the frontend on Vercel.
2. Run the FastAPI backend on Render.
3. Keep your existing managed SQL database in `TUNETRIBE_DATABASE_URL`.
4. Add a Redis or Valkey-compatible shared cache for the backend through `TUNETRIBE_REDIS_URL`.

Backend cache variables:

```env
TUNETRIBE_REDIS_URL=rediss://default:<password>@<host>:<port>/0
TUNETRIBE_METADATA_CACHE_TTL_SECONDS=86400
TUNETRIBE_METADATA_MEMORY_CACHE_MAX_ENTRIES=2048
TUNETRIBE_ANALYTICS_CACHE_TTL_SECONDS=120
TUNETRIBE_GLOBAL_STATS_CACHE_TTL_SECONDS=300
```

Local Docker:

```bash
docker compose up --build
```

The compose stack now includes Valkey automatically and defaults the backend to:

```env
TUNETRIBE_REDIS_URL=redis://valkey:6379/0
```

Render backend setup:

1. Create a Render Key Value service or use another Redis/Valkey-compatible provider.
2. Put the backend and cache in the same region.
3. Set these backend environment variables:

```env
TUNETRIBE_REDIS_URL=<internal-or-external-redis-url>
TUNETRIBE_DATABASE_URL=<your-managed-sql-url>
TUNETRIBE_SECRET_KEY=<long-random-secret>
TUNETRIBE_SEED_DEMO_DATA=false
TUNETRIBE_ALLOWED_HOSTS=<your-render-domain>
TUNETRIBE_CORS_ORIGINS=<your-vercel-domain>
```

If the cache is hosted outside Render, prefer the TLS form `rediss://...`.

Vercel frontend setup:

```env
VITE_API_BASE_URL=https://<your-render-backend-domain>
```

Operational defaults:

- Increase `TUNETRIBE_METADATA_CACHE_TTL_SECONDS` if provider metadata changes rarely and you want fewer upstream calls.
- Increase `TUNETRIBE_ANALYTICS_CACHE_TTL_SECONDS` if analytics traffic is heavy and slight staleness is acceptable.
- Keep `TUNETRIBE_GLOBAL_STATS_CACHE_TTL_SECONDS` short if landing-page counts should move more quickly.
- If you run multiple backend instances, treat `TUNETRIBE_REDIS_URL` as required.

To run the container stack:

```bash
docker compose up --build
```

Copy `.env.example` to `.env` first and replace the placeholder secrets.

## CI/CD

GitHub Actions runs:

- frontend lint, typecheck, tests, production build, and production dependency audit
- backend Ruff lint, `pip check`, pytest, and `pip-audit`
- frontend and backend Docker build validation, with GHCR publishing on version tags

The workflow layout follows the same general pattern used by projects like FastAPI, Pydantic, and Django: separate verification stages, minimal workflow permissions, and explicit dependency checks.

## Demo Account

If demo seeding is enabled, sign in with:

- Email: `alex@example.com`
- Password: `TuneTribe!123`
