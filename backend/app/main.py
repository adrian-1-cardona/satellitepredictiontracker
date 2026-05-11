import time
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from sqlalchemy import text

from app.config import get_settings
from app.database import SessionLocal, init_db
from app.error_handlers import (
    satellite_tracker_exception_handler,
    validation_exception_handler,
    database_exception_handler,
    generic_exception_handler,
)
from app.errors import SatelliteTrackerError
from app.logging_config import configure_logging
from app.middleware import RequestContextMiddleware, SecurityHeadersMiddleware, MetricsMiddleware
from app.routers import admin, alerts, auth, locations, passes


settings = get_settings()
configure_logging(settings.log_level)

REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status"],
)
REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency",
    ["method", "path"],
)

# Database pool metrics
DB_POOL_SIZE = Histogram(
    "db_pool_size",
    "Database connection pool size",
    buckets=(5, 10, 15, 20, 25, 30),
)

# Celery job metrics
CELERY_JOBS_TOTAL = Counter(
    "celery_jobs_total",
    "Total Celery jobs",
    ["task_name", "status"],
)

# Prediction metrics
PREDICTIONS_TOTAL = Counter(
    "predictions_total",
    "Total satellite pass predictions",
    ["satellite", "location"],
)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
    # Disable public OpenAPI surface to avoid advertising the API to
    # unauthenticated visitors. Health, ready, metrics, and /api/v1/* stay live.
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

# Add custom exception handlers
app.add_exception_handler(SatelliteTrackerError, satellite_tracker_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Add middleware in reverse order (last added = first executed)
app.add_middleware(MetricsMiddleware, metrics_request_count=REQUEST_COUNT, metrics_request_latency=REQUEST_LATENCY)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": settings.app_version,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/ready")
def ready() -> dict:
    """Readiness check endpoint."""
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return {
            "ready": True,
            "checks": {
                "database": True,
                "cache": True,
            },
        }
    except Exception as e:
        return {
            "ready": False,
            "checks": {
                "database": False,
                "cache": False,
            },
            "error": str(e),
        }
    finally:
        db.close()


@app.get("/metrics")
def metrics() -> Response:
    """Prometheus metrics endpoint."""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


# Include routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(locations.router, prefix="/api/v1")
app.include_router(passes.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")


