# Implementation Summary

## Status

Implemented backend stack.

This repo began as documentation-only. It now includes a working FastAPI backend with database schema, background jobs, prediction logic, Docker setup, VSCode setup, and tests.

## Backend Architecture

- `app/main.py`: FastAPI app, CORS, request IDs, health, readiness, metrics, router registration.
- `app/config.py`: Pydantic settings loaded from `.env`.
- `app/database.py`: SQLAlchemy engine/session setup with SQLite test support.
- `app/models.py`: ORM models for users, refresh tokens, locations, passes, alerts, alert history, API keys, and job history.
- `app/auth.py`: Password hashing, JWT access tokens, refresh tokens, current-user dependency, admin dependency.
- `app/satellites.py`: TLE parsing, CelesTrak fetch/cache, fallback ISS TLE, Skyfield pass prediction, brightness and quality estimation.
- `app/tasks.py`: Celery app and jobs for prediction, all-location refresh, alert matching, cleanup, and TLE refresh.
- `app/routers/`: Auth, locations, passes, alerts, and admin APIs.

## Database

Alembic migration `001_initial_schema.py` creates:

- `users`
- `refresh_tokens`
- `locations`
- `passes`
- `alerts`
- `alert_history`
- `api_keys`
- `job_history`

Important indexes cover user lookup, location lookup, pass time ranges, satellite filtering, alert history, API keys, and job status.

## Prediction Behavior

Prediction uses Skyfield against TLE data.

- First preference: cached TLE file at `data/stations.tle`.
- Second preference: fetch from CelesTrak `stations.txt`.
- Fallback: bundled ISS TLE for offline tests and demos.

Passes are stored with rise, culmination, set, max elevation, estimated brightness, quality, prediction time, and expiry.

## Background Jobs

Celery commands:

```bash
celery -A app.tasks:celery_app worker --loglevel=info
celery -A app.tasks:celery_app beat --loglevel=info
```

Jobs:

- `predict_passes_for_location`
- `predict_passes_for_all_locations`
- `check_and_send_alerts`
- `cleanup_expired_passes`
- `refresh_tle_data`

## Tests

Implemented tests cover:

- TLE parsing.
- Invalid coordinates.
- Brightness and pass quality.
- Fixed-date ISS prediction.
- Auth/register/refresh/me flow.
- Protected-route rejection.
- Location, pass refresh, alert CRUD, health, and readiness smoke flow.
- Expected tables and pass indexes.
- Cascading deletes.

Run:

```bash
pytest
```

## Known Boundaries

- No frontend in this pass.
- No Kubernetes manifests in this pass.
- Alert delivery is simulated by writing `alert_history`; real email/SMS/push providers can be added behind the task layer.
- API key storage exists, but API-key authentication endpoints are not exposed yet.

