# Quick Setup Answer

## Do I Need Any Accounts?

No accounts are required for local development.

Everything runs on your machine:

- FastAPI
- PostgreSQL
- Redis
- Celery worker and scheduler
- PgAdmin through Docker Compose

Optional accounts are only needed later if you deploy the project or wire real notification providers.

## What Do I Need Installed?

Recommended:

- Python 3.11+
- Docker Desktop
- VSCode
- Git

If you do not use Docker, also install PostgreSQL and Redis locally.

## Fastest Setup

```bash
cp .env.example .env
docker-compose up --build
```

Open http://localhost:8000/docs.

## VSCode Setup

The repo includes:

- `.vscode/settings.json`
- `.vscode/launch.json`
- `.vscode/extensions.json`

Install the recommended extensions when VSCode prompts you. The main debug configs are:

- `Python: FastAPI`
- `Python: Pytest`
- `Python: Celery Worker`

## Local Python Setup

```bash
python -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
python -m uvicorn app.main:app --reload
```

Worker:

```bash
celery -A app.tasks:celery_app worker --loglevel=info
```

Scheduler:

```bash
celery -A app.tasks:celery_app beat --loglevel=info
```

## Test

```bash
pytest
```

