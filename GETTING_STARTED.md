# 🚀 Getting Started with Satellite Tracker

## Quick Start (5 minutes)

### Option 1: Docker Compose (Recommended)

```bash
# Clone repository
git clone <repo>
cd satellite-tracker

# Start all services
docker-compose up -d

# Verify services
docker-compose ps

# Check logs
docker-compose logs -f api
```

Access the services:
- **API Docs**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc
- **Database Admin**: http://localhost:5050 (PgAdmin)
  - Email: `admin@tracker.local`
  - Password: `admin`

### Option 2: Local Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup database
createdb satellite_tracker
alembic upgrade head

# Copy environment config
cp .env.example .env
# Edit .env with your values

# Terminal 1: Start API
python -m uvicorn app.main:app --reload

# Terminal 2: Start Celery worker
celery -A app.tasks celery_app worker --loglevel=info

# Terminal 3: Start Celery beat (scheduler)
celery -A app.tasks celery_app beat --loglevel=info
```

---

## API Workflow Example

### 1. Register User

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'

# Response:
{
  "user_id": 1,
  "email": "user@example.com",
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 900
}
```

Save the `access_token` for subsequent requests.

### 2. Create a Location

```bash
curl -X POST http://localhost:8000/api/v1/locations \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New York City",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "elevation_m": 10
  }'

# Response:
{
  "id": 1,
  "user_id": 1,
  "name": "New York City",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "elevation_m": 10,
  "created_at": "2024-01-15T10:00:00",
  "updated_at": "2024-01-15T10:00:00"
}
```

The API automatically queues pass prediction in the background.

### 3. List Satellite Passes

```bash
# Wait ~30 seconds for predictions to complete, then:

curl -X GET "http://localhost:8000/api/v1/passes?location_id=1&days_ahead=12" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Response:
[
  {
    "id": 1,
    "location_id": 1,
    "satellite_name": "ISS (ZARYA)",
    "rise_time": "2024-01-16T14:32:00",
    "culmination_time": "2024-01-16T14:36:45",
    "set_time": "2024-01-16T14:41:00",
    "max_elevation": 62.5,
    "brightness": 1.2,
    "pass_quality": "excellent"
  },
  ...
]
```

### 4. Create an Alert

```bash
curl -X POST http://localhost:8000/api/v1/alerts \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "location_id": 1,
    "satellite_name": "ISS (ZARYA)",
    "min_elevation": 30,
    "max_brightness": 2,
    "notification_method": "email"
  }'

# Response:
{
  "id": 1,
  "user_id": 1,
  "location_id": 1,
  "satellite_name": "ISS (ZARYA)",
  "min_elevation": 30,
  "max_brightness": 2,
  "enabled": true,
  "notification_method": "email",
  "created_at": "2024-01-15T10:15:00",
  "updated_at": "2024-01-15T10:15:00"
}
```

### 5. View Alert History

```bash
curl -X GET "http://localhost:8000/api/v1/alerts/history?days=7" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Response shows which alerts were sent and delivery status
```

---

## Running Tests

```bash
# All tests
pytest tests/ -v

# Specific test file
pytest tests/test_satellites.py -v

# With coverage report
pytest tests/ --cov=app --cov-report=html

# Only satellite prediction tests
pytest tests/test_satellites.py::TestPassPrediction -v

# Show test output
pytest -s tests/test_satellites.py
```

---

## Database Inspection

### Using psql

```bash
psql postgresql://tracker:tracker_dev_password@localhost:5432/satellite_tracker

# Useful queries:
SELECT * FROM users;
SELECT * FROM locations;
SELECT * FROM passes WHERE satellite_name = 'ISS (ZARYA)' LIMIT 10;
SELECT * FROM alerts;
```

### Using PgAdmin UI

1. Go to http://localhost:5050
2. Add new server:
   - Host: `postgres`
   - Username: `tracker`
   - Password: `tracker_dev_password`
   - Database: `satellite_tracker`

---

## Monitoring

### View API Logs

```bash
docker-compose logs -f api
```

### View Celery Worker Logs

```bash
docker-compose logs -f celery_worker
```

### Check Job Queue Status

```bash
curl http://localhost:8000/api/v1/admin/job-status \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Prometheus Metrics

```bash
curl http://localhost:8000/metrics
```

---

## Common Issues & Solutions

### Issue: "Database connection refused"

**Solution**: Ensure PostgreSQL is running and connection string is correct:
```bash
# Docker Compose
docker-compose logs postgres

# Or check with psql
psql postgresql://tracker:tracker_dev_password@localhost:5432/satellite_tracker
```

### Issue: "No passes found"

**Reason**: Pass predictions are async. They take 10-30 seconds after location creation.

**Solution**: 
1. Wait 30 seconds
2. Manually trigger refresh:
   ```bash
   curl -X POST http://localhost:8000/api/v1/passes/refresh \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
3. Check Celery worker logs for errors

### Issue: Celery tasks not running

**Solution**: Ensure Redis is running:
```bash
docker-compose exec redis redis-cli ping
# Should respond: PONG
```

### Issue: "Token expired" on login

**Reason**: Access tokens expire after 15 minutes.

**Solution**: Use the `refresh_token` to get a new access token:
```bash
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "YOUR_REFRESH_TOKEN"}'
```

---

## Development Workflow

### Making Code Changes

```bash
# The API auto-reloads with --reload flag in docker-compose

# For workers, restart them:
docker-compose restart celery_worker celery_beat
```

### Adding a New Route

1. Create route in `app/routers/new_router.py`
2. Include router in `app/main.py`:
   ```python
   app.include_router(
       new_router.router,
       prefix="/api/v1/new",
       tags=["New Feature"]
   )
   ```
3. Test endpoint in browser: http://localhost:8000/docs

### Running Migrations

```bash
# Create new migration
alembic revision -m "add_new_column"

# Edit alembic/versions/xxx_add_new_column.py

# Apply migration
alembic upgrade head
```

---

## Deployment Checklist

Before deploying to production:

- [ ] Change `SECRET_KEY` in `.env`
- [ ] Set `DEBUG=false` in config
- [ ] Update `ALLOWED_ORIGINS` for your domain
- [ ] Configure email service (SMTP)
- [ ] Set up monitoring (Sentry, DataDog)
- [ ] Enable HTTPS/SSL
- [ ] Configure database backups
- [ ] Set up log aggregation
- [ ] Review security headers
- [ ] Load test the API

---

## Next Steps

1. **Explore the API**: Visit http://localhost:8000/docs
2. **Run tests**: `pytest tests/ -v`
3. **Check README**: See `README.md` for full documentation
4. **Deploy**: Follow `DEPLOYMENT.md` for production setup

---

## Support

- **Documentation**: See README.md
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: support@tracker.example.com

Happy tracking! 🛰️✨
