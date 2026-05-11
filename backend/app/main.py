import time
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from sqlalchemy import text

from app.config import get_settings
from app.database import SessionLocal, init_db
from app.errors import SatelliteTrackerError, satellite_tracker_exception_handler
from app.logging_config import configure_logging
from app.routers import admin, alerts, auth, locations, passes


settings = get_settings()
configure_logging(settings.log_level)

REQUEST_COUNT = Counter("http_requests_total", "Total HTTP requests", ["method", "path", "status"])
REQUEST_LATENCY = Histogram("http_request_duration_seconds", "HTTP request latency", ["method", "path"])

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
app.add_exception_handler(SatelliteTrackerError, satellite_tracker_exception_handler)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def handle_satellite_tracker_error(request: Request, exc: Exception):
    if isinstance(exc, SatelliteTrackerError):
        return satellite_tracker_exception_handler(request, exc)
    raise exc

app.add_exception_handler(SatelliteTrackerError, handle_satellite_tracker_error)


@app.middleware("http")
async def request_context(request: Request, call_next):
    request.state.request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    start = time.perf_counter()
    response = await call_next(request)
    duration = time.perf_counter() - start
    REQUEST_COUNT.labels(request.method, request.url.path, str(response.status_code)).inc()
    REQUEST_LATENCY.labels(request.method, request.url.path).observe(duration)
    response.headers["X-Request-ID"] = request.state.request_id
    return response


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict:
    return {"status": "healthy", "version": settings.app_version, "timestamp": datetime.now(timezone.utc)}


@app.get("/ready")
def ready() -> dict:
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return {"ready": True, "checks": {"database": True, "cache": True}}
    finally:
        db.close()


@app.get("/metrics")
def metrics() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


app.include_router(auth.router, prefix="/api/v1")
app.include_router(locations.router, prefix="/api/v1")
app.include_router(passes.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")

