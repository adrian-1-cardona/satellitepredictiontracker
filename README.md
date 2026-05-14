# Satellite Tracker

A full-stack satellite pass tracker with a FastAPI backend, PostgreSQL/Redis services, Celery background jobs, and a React/Vite frontend with a 3D satellite visualization.

## What Is Included

- FastAPI API under `backend/app`
- PostgreSQL, Redis, Celery worker, Celery beat, PgAdmin, Prometheus, Grafana, Loki, and Promtail in `backend/docker-compose.yml`
- React 19 + TypeScript frontend under `frontend/src`
- Alembic migrations under `backend/alembic`
- Backend, frontend, compose, Docker build, and security GitHub Actions workflows
- Public setup docs in [backend/BACKEND_SETUP.md](backend/BACKEND_SETUP.md) and [docs/README.md](docs/README.md)

## Quick Start

Prerequisites:

- Node.js 22+
- Docker and Docker Compose
- Python 3.11+ for local backend development

Create a local env file:

```bash
cp .env.example .env
```

Start the backend stack:

```bash
cd backend
docker compose --env-file ../.env up --build
```

Start the frontend in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:8000/health`
- Backend readiness: `http://localhost:8000/ready`
- Metrics: `http://localhost:8000/metrics`
- Grafana: `http://localhost:3001`
- PgAdmin: `http://localhost:5050`

Swagger UI, ReDoc, and the raw OpenAPI schema are intentionally disabled. `/docs`, `/redoc`, and `/openapi.json` return 404.

## Environment Files

`.env.example` is committed as the template. `.env` is local-only and ignored by git. If you make this repository public after having committed real secrets in the past, rotate those secrets and rewrite/purge the affected history before publishing.

## Development

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m pytest
```

Frontend:

```bash
cd frontend
npm install
npm run typecheck
npm test
npm run build
```

Docker compose validation:

```bash
cd backend
docker compose config --quiet
```

## Repository Map

- [backend/BACKEND_SETUP.md](backend/BACKEND_SETUP.md): backend setup, compose commands, ports, health checks, and disabled-docs behavior
- [docs/README.md](docs/README.md): verification pathway and API notes
- [frontend/README.md](frontend/README.md): frontend setup and build notes
- [frontend/index.html](frontend/index.html): Vite HTML entry point
- [LICENSE](LICENSE): MIT license

## License

MIT
