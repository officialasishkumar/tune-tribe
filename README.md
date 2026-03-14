# TuneTribe

TuneTribe is now organized as a frontend/backend workspace:

- `frontend/`: React + Vite client
- `backend/`: FastAPI API with auth, groups, friends, tracks, analytics, and metadata enrichment

## Local development

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

## Production notes

- Set `TUNETRIBE_SECRET_KEY` to a strong random secret.
- Set `TUNETRIBE_DATABASE_URL` to Postgres or another production database.
- Set `TUNETRIBE_ALLOWED_HOSTS` and `TUNETRIBE_CORS_ORIGINS` for your deployed domains.
- Disable demo data with `TUNETRIBE_SEED_DEMO_DATA=false`.
- Use the provided Dockerfiles or `compose.yaml` as a deployment baseline, not as a final autoscaling strategy.

## Demo account

If demo seeding is enabled, you can sign in with:

- Email: `alex@example.com`
- Password: `TuneTribe!123`
