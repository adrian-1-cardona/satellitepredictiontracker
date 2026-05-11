# Satellite Tracker Documentation

## Verification Pathway

This guide walks through verifying a working deployment of the Satellite Tracker.

### Prerequisites
- Docker & Docker Compose installed
- Environment file configured (`.env` at workspace root)

### Local Verification

1. **Start the Docker Compose stack** from the backend directory:
   ```bash
   cd backend && docker compose --env-file ../.env up --build
   ```
   Wait for the output "Application startup complete".

2. **Verify API health** - check the health endpoint:
   ```bash
   curl http://localhost:8000/health
   ```
   Expected response: `{"status":"ok"}`

3. **Verify readiness** - ensure dependencies are ready:
   ```bash
   curl http://localhost:8000/ready
   ```
   Expected response: `{"status":"ready"}`

4. **Verify metrics collection** - check Prometheus metrics endpoint:
   ```bash
   curl http://localhost:8000/metrics
   ```
   Expected response: Prometheus-format metrics output

### Service URLs

- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **API Health**: http://localhost:8000/health
- **API Ready**: http://localhost:8000/ready
- **API Metrics**: http://localhost:8000/metrics
- **PgAdmin**: http://localhost:5050 (admin@tracker.local / admin)

### API Documentation

The Swagger (`/docs`), ReDoc (`/redoc`), and OpenAPI schema (`/openapi.json`) documentation endpoints are **disabled** in production and return 404 responses. API documentation is available only through authenticated admin endpoints.


### Troubleshooting

- If containers fail to start, check `.env` and ensure all required variables are set
- View container logs: `docker compose logs -f`
- Restart from scratch: `docker compose down -v && docker compose up --build`
