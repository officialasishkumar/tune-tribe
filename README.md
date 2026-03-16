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
- Tune metadata resolution is cache-backed; tune `TUNETRIBE_METADATA_HTTP_TIMEOUT_SECONDS`, `TUNETRIBE_METADATA_CACHE_TTL_SECONDS`, and `TUNETRIBE_METADATA_MEMORY_CACHE_MAX_ENTRIES` to match provider traffic and latency expectations.
- Only set `TUNETRIBE_FORWARDED_ALLOW_IPS` if the backend is behind a trusted reverse proxy.
- Login attempts are rate-limited, JWTs now carry issuer and token-type claims, API responses send defensive security headers, and user-supplied avatar/music URLs are validated more strictly.

To run the container stack:

```bash
docker compose up --build
```

Copy `.env.example` to `.env` first and replace the placeholder secrets.

## Telemetry

The frontend now includes an opt-in telemetry layer for SPA pageviews and click events.

What it does:

- Pushes `tunetribe_pageview` and `tunetribe_click` events to `window.dataLayer`
- Optionally forwards the same events to a self-hosted Umami instance
- Uses a session-scoped ID and an internal user ID only after login
- Skips password/email/tel/search/number inputs by default
- Lets you block additional elements with `data-telemetry-skip="true"`

Enable it:

```bash
VITE_TELEMETRY_ENABLED=true
VITE_TELEMETRY_CAPTURE_TEXT=false
VITE_TELEMETRY_SKIP_PATHS=/auth*
```

Optional Umami forwarding:

```bash
VITE_UMAMI_SCRIPT_URL=https://analytics.example.com/script.js
VITE_UMAMI_WEBSITE_ID=replace-with-your-umami-website-id
VITE_UMAMI_HOST_URL=https://analytics.example.com
VITE_UMAMI_DOMAINS=app.example.com
```

Security defaults:

- Leave `VITE_TELEMETRY_CAPTURE_TEXT=false` unless you have reviewed every clickable label for sensitive data.
- Keep auth flows excluded with `VITE_TELEMETRY_SKIP_PATHS=/auth*`.
- Mark any private UI region with `data-telemetry-skip="true"`.
- Do not send email addresses or raw usernames to analytics destinations; the app only identifies users as `user-<id>`.
- Serve analytics endpoints behind HTTPS and restrict Umami to your production domain with `VITE_UMAMI_DOMAINS`.

Google Tag Manager / GA4:

1. Install GTM on the frontend as usual.
2. Create a Custom Event trigger for `tunetribe_click`.
3. Create a second Custom Event trigger for `tunetribe_pageview`.
4. Map the data layer keys you need, for example `page_path`, `click_name`, `click_selector`, and `click_tag`.
5. Send only the events you actually need into GA4. Raw clickstream data can become noisy and expensive there, so keep Umami or another OSS backend as the source of truth for full-fidelity click telemetry.

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
