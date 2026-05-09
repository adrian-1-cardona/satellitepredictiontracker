# Backend Setup

## Overview

The `backend/` folder contains everything needed to run the Satellite Tracker backend: the FastAPI application under `app/`, the Alembic migrations under `alembic/`, the pytest suite under `tests/`, and the operational files `Dockerfile.api`, `docker-compose.yml`, `requirements.txt`, `pytest.ini`, and `alembic.ini`. Shared assets (`data/`, `docs/`, `instructions/`) and environment files (`.env`, `.env.example`) stay at the workspace root and are referenced from `backend/` via relative paths.

## Docker Compose Quickstart

Run the full stack (API, Celery worker, Celery beat, Postgres, Redis, PgAdmin) from the `backend/` folder:

```bash
cd backend && docker compose --env-file ../.env up --build
```

The `--env-file ../.env` flag points Compose at the workspace-root `.env` so variable interpolation and any future `${VAR}` substitutions pick up the canonical values. The compose file lives in `backend/`, so Compose resolves the build context (`.`) to `backend/` automatically.

## Fixed Host Ports

The Compose stack always publishes the same host ports regardless of environment overrides:

| Service  | Host Port |
| -------- | --------- |
| API      | `8000`    |
| Postgres | `5432`    |
| Redis    | `6379`    |
| PgAdmin  | `5050`    |

## Health and Metrics URLs

With the Compose stack running, the following URLs are available on `localhost`:

- Health: `http://localhost:8000/health`
- Readiness: `http://localhost:8000/ready`
- Metrics (Prometheus text format): `http://localhost:8000/metrics`

Example check:

```bash
curl http://localhost:8000/health
```

Expected JSON shape:

```json
{ "status": "healthy", "version": "1.0.0", "timestamp": "2024-01-01T00:00:00+00:00" }
```

## Disabled Docs

Swagger UI at `/docs` and ReDoc at `/redoc` are intentionally disabled, and the OpenAPI schema at `/openapi.json` is not served. Both `/docs` and `/redoc` return HTTP 404, and `/openapi.json` returns HTTP 404 as well. This avoids advertising the API surface to unauthenticated visitors.

To exercise the API, use `curl` directly against the `/api/v1/*` routes (see `docs/README.md` for the full route list) or the future frontend once it is wired in. The runtime contract of every `/api/v1/*` endpoint is unchanged.

## Local Python Setup

If you prefer running the backend outside Docker:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
```

`alembic upgrade head` requires a reachable Postgres instance. Either start the `postgres` service from the Compose stack (`docker compose --env-file ../.env up postgres`) or point `DATABASE_URL` at your own Postgres before running the migration.

## Local Run Commands

Run each process in its own terminal from `backend/`:

```bash
# API server
uvicorn app.main:app --reload

# Celery worker
celery -A app.tasks:celery_app worker --loglevel=info

# Celery beat scheduler
celery -A app.tasks:celery_app beat --loglevel=info
```

## Env File Convention

`.env` and `.env.example` live at the workspace root and are never moved into `backend/`. Two conventions keep them discoverable:

- **Docker**: invoke Compose from `backend/` with `--env-file ../.env` (as shown in the quickstart above). Equivalent from the workspace root: `docker compose -f backend/docker-compose.yml --env-file .env up --build`.
- **Local (non-Docker)**: run from the workspace-root CWD so `pydantic-settings` picks up `.env` automatically, or pass an explicit path via `ENV_FILE=../.env` when running from `backend/`. Uvicorn and Celery both honour the process CWD, so launching them from the workspace root with module paths (`uvicorn app.main:app --app-dir backend`) is equivalent.

If `.env` is missing, copy the example:

```bash
cp .env.example .env
```

## Data Volume

The Compose stack mounts the workspace-root `data/` directory into every Python service at `/app/data` via `../data:/app/data`. The TLE cache path configured with `TLE_CACHE_PATH` (default `/app/data/stations.tle` inside the container) therefore writes through to the host `data/` folder. Keep `data/` at the workspace root so the API, Celery worker, and Celery beat all share the same cache.
