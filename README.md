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

Create a local development env file from the template:

```bash
cp .env.example .env
mkdir -p secrets
printf '%s\n' 'dev-admin-token-change-in-production' > secrets/admin_token
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

`.env.example` is the committed template. `.env` is ignored and should be created locally or supplied by CI secrets; never commit real production credentials. If real secrets were ever committed, rotate them and purge the affected history before publishing.

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
docker compose --env-file ../.env config --quiet
```

## Repository Map

- [backend/BACKEND_SETUP.md](backend/BACKEND_SETUP.md): backend setup, compose commands, ports, health checks, and disabled-docs behavior
- [docs/README.md](docs/README.md): verification pathway and API notes
- [frontend/README.md](frontend/README.md): frontend setup and build notes
- [frontend/index.html](frontend/index.html): Vite HTML entry point
- [LICENSE](LICENSE): MIT license

## License

MIT
