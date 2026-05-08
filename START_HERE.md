# Start Here

You now have an implemented backend stack, not just documentation.

## What Exists

- FastAPI app in `app/`
- SQLAlchemy models and Alembic migration
- JWT authentication
- Location, pass, alert, admin, health, readiness, and metrics endpoints
- Celery tasks for predictions, refresh, alert matching, cleanup, and TLE updates
- Skyfield-based pass prediction with offline fallback TLE
- Docker Compose stack
- VSCode configuration in `.vscode/`
- Tests in `tests/`

## What Does Not Exist In This Pass

- No frontend app
- No Kubernetes manifests
- No production email/SMS provider integration

Alert delivery is simulated by inserting rows into `alert_history`.

## Run It

```bash
cp .env.example .env
docker-compose up --build
```

Open http://localhost:8000/docs.

## Develop Locally

```bash
python -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
python -m uvicorn app.main:app --reload
```

In separate terminals:

```bash
celery -A app.tasks:celery_app worker --loglevel=info
celery -A app.tasks:celery_app beat --loglevel=info
```

## Verify

```bash
pytest
curl http://localhost:8000/health
curl http://localhost:8000/ready
curl http://localhost:8000/metrics
```

## Files To Read First

1. `README.md` for the full backend overview.
2. `GETTING_STARTED.md` for commands and API examples.
3. `VSCODE_SETUP.md` for editor/debug setup.
4. `IMPLEMENTATION_SUMMARY.md` for what was built.

