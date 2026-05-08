# Satellite Tracker Backend

A backend-first satellite pass prediction and alert platform built with FastAPI, PostgreSQL, Redis, Celery, SQLAlchemy, Alembic, and Skyfield.

This repository now contains the implemented backend stack described in the setup notes. It does not include a frontend or Kubernetes manifests in this pass.

## What Is Implemented

- JWT authentication with register, login, refresh, logout, and current-user endpoints.
- User-owned observation locations with CRUD endpoints.
- Satellite pass prediction using Skyfield and TLE data, with a cached CelesTrak fetch and bundled ISS fallback.
- Pass listing, detail, stats, satellite list, and refresh queue endpoints.
- Alert CRUD, alert history, and alert stats endpoints.
- Celery jobs for pass prediction, all-location refresh, alert matching, expired pass cleanup, and TLE refresh.
- PostgreSQL schema with Alembic migration for users, refresh tokens, locations, passes, alerts, alert history, API keys, and job history.
- Health, readiness, and Prometheus metrics endpoints.
- Docker Compose stack for PostgreSQL, Redis, API, Celery worker, Celery beat, and PgAdmin.
- VSCode settings, launch configs, and extension recommendations.
- Unit, API smoke, and schema tests.

## Project Structure

```text
.
├── app/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── auth.py
│   ├── satellites.py
│   ├── tasks.py
│   └── routers/
├── alembic/
│   ├── env.py
│   └── versions/001_initial_schema.py
├── tests/
├── .vscode/
├── docker-compose.yml
├── Dockerfile.api
├── requirements.txt
├── .env.example
└── pytest.ini
```

## Quick Start With Docker

```bash
cp .env.example .env
docker-compose up --build
```

Services:

- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/health
- Readiness: http://localhost:8000/ready
- Metrics: http://localhost:8000/metrics
- PgAdmin: http://localhost:5050
  - Email: `admin@tracker.local`
  - Password: `admin`

## Local Development

```bash
python -m venv venv
source venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
```

Start the API:

```bash
python -m uvicorn app.main:app --reload
```

Start Celery worker:

```bash
celery -A app.tasks:celery_app worker --loglevel=info
```

Start Celery beat:

```bash
celery -A app.tasks:celery_app beat --loglevel=info
```

## API Overview

Authentication:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

Locations:

- `GET /api/v1/locations`
- `POST /api/v1/locations`
- `GET /api/v1/locations/{location_id}`
- `PATCH /api/v1/locations/{location_id}`
- `DELETE /api/v1/locations/{location_id}`

Passes and satellites:

- `GET /api/v1/passes`
- `POST /api/v1/passes/refresh`
- `GET /api/v1/passes/stats`
- `GET /api/v1/passes/{pass_id}`
- `GET /api/v1/satellites`

Alerts:

- `GET /api/v1/alerts`
- `POST /api/v1/alerts`
- `GET /api/v1/alerts/history`
- `GET /api/v1/alerts/stats`
- `GET /api/v1/alerts/{alert_id}`
- `PATCH /api/v1/alerts/{alert_id}`
- `DELETE /api/v1/alerts/{alert_id}`

Admin:

- `GET /api/v1/admin/stats`
- `GET /api/v1/admin/job-status`
- `GET /api/v1/admin/job-status/{task_id}`
- `GET /api/v1/admin/users`
- `PATCH /api/v1/admin/users/{user_id}/active`
- `POST /api/v1/admin/cleanup`

System:

- `GET /health`
- `GET /ready`
- `GET /metrics`

## Example Flow

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!"}'
```

Use the returned access token:

```bash
curl -X POST http://localhost:8000/api/v1/locations \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"New York City","latitude":40.7128,"longitude":-74.0060,"elevation_m":10}'
```

Creating or updating a location queues pass prediction. If Redis is unavailable in a local process, the code falls back to synchronous prediction so development flows remain usable.

## Testing

```bash
pytest
pytest tests/test_satellites.py -v
pytest --cov=app --cov-report=html
```

The test suite uses SQLite fixtures for speed and includes:

- TLE parsing, brightness/quality, invalid coordinates, and fixed-date Skyfield prediction tests.
- Auth/location/pass/alert API smoke tests.
- Schema/index/cascade verification.

## Notes

- TLE data is fetched from CelesTrak when available and cached at `data/stations.tle`.
- The bundled fallback TLE keeps tests and demos working offline.
- Email/SMS/push delivery is simulated in v1 by writing alert history rows.
- For local work, use a virtual environment to avoid dependency conflicts with globally installed Python packages.

