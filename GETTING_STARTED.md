# Getting Started

This project is a backend-only satellite tracker stack: FastAPI API, PostgreSQL, Redis, Celery, Alembic, and Skyfield pass prediction.

## Fastest Path

```bash
cp .env.example .env
docker-compose up --build
```

Then open:

- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/health
- PgAdmin: http://localhost:5050

PgAdmin login:

- Email: `admin@tracker.local`
- Password: `admin`

## Local Python Setup

```bash
python -m venv venv
source venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
```

Start the three local processes:

```bash
python -m uvicorn app.main:app --reload
celery -A app.tasks:celery_app worker --loglevel=info
celery -A app.tasks:celery_app beat --loglevel=info
```

## API Workflow

Register:

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!"}'
```

Create a location:

```bash
curl -X POST http://localhost:8000/api/v1/locations \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"New York City","latitude":40.7128,"longitude":-74.0060,"elevation_m":10}'
```

List predicted passes:

```bash
curl "http://localhost:8000/api/v1/passes?location_id=1&days_ahead=12" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Create an alert:

```bash
curl -X POST http://localhost:8000/api/v1/alerts \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"location_id":1,"satellite_name":"ISS (ZARYA)","min_elevation":30,"max_brightness":2,"notification_method":"email"}'
```

View alert history:

```bash
curl "http://localhost:8000/api/v1/alerts/history?days=7" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Tests

```bash
pytest
pytest tests/test_satellites.py -v
pytest --cov=app --cov-report=html
```

## Database

Docker connection string:

```bash
psql postgresql://tracker:tracker_dev_password@localhost:5432/satellite_tracker
```

Useful checks:

```sql
SELECT * FROM users;
SELECT * FROM locations;
SELECT * FROM passes ORDER BY rise_time LIMIT 10;
SELECT * FROM alerts;
SELECT * FROM job_history ORDER BY created_at DESC;
```

## Common Issues

If PostgreSQL is unavailable, use Docker Compose or start your local server before running migrations.

If Celery cannot connect, verify Redis:

```bash
redis-cli ping
```

If no passes appear immediately after creating a location, check the Celery worker logs. Prediction uses real orbital calculations and runs as a background job.

