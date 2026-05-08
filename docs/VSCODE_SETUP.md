# VSCode Setup

The project includes VSCode configuration in `.vscode/`.

## Recommended Extensions

VSCode should prompt from `.vscode/extensions.json`. Install:

- Python
- Pylance
- Black Formatter
- Flake8
- Mypy Type Checker
- SQLTools
- SQLTools PostgreSQL driver
- REST Client
- Docker

## Interpreter

Create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
```

Then choose `./venv/bin/python` from `Python: Select Interpreter`.

## Debug Configurations

Available in `.vscode/launch.json`:

- `Python: FastAPI`
- `Python: Pytest`
- `Python: Celery Worker`

The FastAPI debug config runs:

```bash
python -m uvicorn app.main:app --reload --host=0.0.0.0 --port=8000
```

The Celery debug config runs:

```bash
celery -A app.tasks:celery_app worker --loglevel=debug
```

## Database Connection

SQLTools is preconfigured for:

```text
Host: localhost
Port: 5432
Database: satellite_tracker
Username: tracker
Password: tracker_dev_password
```

With Docker Compose running, connect to `satellite_tracker`.

## Run Tests

Terminal:

```bash
pytest
```

VSCode:

1. Open the Testing sidebar.
2. Refresh tests if needed.
3. Run all tests or individual test functions.

## REST Client Example

Create a `test.http` file if you want saved API requests:

```http
### Register
POST http://localhost:8000/api/v1/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "SecurePass123!"
}

### Create location
POST http://localhost:8000/api/v1/locations
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "name": "New York City",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "elevation_m": 10
}
```

## Ports

- FastAPI: http://localhost:8000
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- PgAdmin: http://localhost:5050

