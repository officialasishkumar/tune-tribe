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

## CI/CD

GitHub Actions now provides:

- `CI`: frontend lint, typecheck, tests, and production build plus backend pytest on pushes to `main` and on pull requests.
- `Docker`: build validation for frontend and backend images on pull requests and pushes to `main`, with GHCR publishing on version tags like `v1.0.0`.
- `Dependency Review`: pull-request checks for newly introduced dependency risk.

## Production notes

- PostgreSQL is the recommended production database for TuneTribe because the app relies on relational joins across users, friendships, groups, memberships, and track shares.
- Set `TUNETRIBE_SECRET_KEY` to a strong random secret and do not commit real secrets into the repo.
- Set `TUNETRIBE_ALLOWED_HOSTS` and `TUNETRIBE_CORS_ORIGINS` for your deployed domains.
- Disable demo data with `TUNETRIBE_SEED_DEMO_DATA=false`.
- The provided Dockerfiles and `compose.yaml` now run a PostgreSQL-backed stack with persistent storage, health checks, and startup gating suitable as a production baseline.

## Database structure

TuneTribe uses a relational schema:

- `users`: account identity, hashed password, profile metadata
- `friendships`: directed friend relationships from one user to another
- `groups`: group ownership records
- `group_memberships`: membership rows linking users to groups, including role
- `track_shares`: shared music entries linked to both a group and the user who shared them

Auth flow:

1. `POST /api/auth/register` validates uniqueness, stores the user with an Argon2 password hash, creates a personal group, and returns a JWT.
2. `POST /api/auth/login` verifies the password hash and returns a JWT.
3. `GET /api/auth/me` resolves the bearer token back to the current user.
4. All group, friendship, profile, and track routes use that authenticated user context.

For containerized deployment, copy [`.env.example`](/home/ashish/asish_workspace/projects/tune-tribe/.env.example) to `.env`, set strong secrets, and run:

```bash
docker compose up --build
```

## Demo account

If demo seeding is enabled, you can sign in with:

- Email: `alex@example.com`
- Password: `TuneTribe!123`
