# Satellite Tracker Docs

This repository contains a FastAPI backend and a React/Vite frontend for satellite pass prediction. The backend owns the API, database, worker, and observability stack; the frontend owns the browser experience and 3D visualization.

## Verification Pathway

Start the backend stack from the `backend/` directory:

```bash
cd backend
docker compose --env-file ../.env up --build
```

Check the live backend endpoints:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/ready
curl http://localhost:8000/metrics
```

Expected public utility URLs:

- Health: `http://localhost:8000/health`
- Readiness: `http://localhost:8000/ready`
- Metrics: `http://localhost:8000/metrics`

Swagger UI, ReDoc, and the raw OpenAPI schema are intentionally disabled for public visitors. These paths return HTTP 404:

- `/docs`
- `/redoc`
- `/openapi.json`

Run frontend checks from `frontend/`:

```bash
npm install
npm run typecheck
npm test
npm run build
```

Run backend checks from `backend/`:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m pytest
```

## API Surface

The application routes live under `/api/v1/*` and include authentication, saved locations, satellite passes, alerts, and admin operations. See `backend/app/routers/` for the route implementations.

## Environment Files

`.env` is committed with development-only placeholder values so Docker Compose and CI checks work from a fresh checkout. `.env.example` remains the editable template. Keep real credentials in environment variables, CI secrets, or private local override files such as `.env.local`.
