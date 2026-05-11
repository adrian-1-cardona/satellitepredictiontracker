"""Middleware for FastAPI app: rate limiting, security headers, request tracking."""

import json
import logging
import time
import uuid
from typing import Callable

from fastapi import Request, Response
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware


# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# JSON logger for structured logging
json_logger = logging.getLogger("satellite_tracker.json")


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Add request ID and user context to request state for logging."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request.state.request_id = str(uuid.uuid4())
        request.state.user_id = None  # Will be set by auth middleware if present

        # Extract user from JWT if available
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            # User ID could be parsed from JWT here if needed
            pass

        response = await call_next(request)
        response.headers["X-Request-ID"] = request.state.request_id
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        return response


class MetricsMiddleware(BaseHTTPMiddleware):
    """Log metrics and structured logs for all requests."""

    def __init__(self, app, metrics_request_count, metrics_request_latency):
        super().__init__(app)
        self.request_count = metrics_request_count
        self.request_latency = metrics_request_latency

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        request.state.start_time = start_time

        try:
            response = await call_next(request)
        except Exception as exc:
            # Record metrics for failed requests
            duration = time.time() - start_time
            self.request_count.labels(
                method=request.method,
                path=request.url.path,
                status=500,
            ).inc()
            self.request_latency.labels(
                method=request.method,
                path=request.url.path,
            ).observe(duration)
            raise

        # Record metrics
        duration = time.time() - start_time
        self.request_count.labels(
            method=request.method,
            path=request.url.path,
            status=response.status_code,
        ).inc()
        self.request_latency.labels(
            method=request.method,
            path=request.url.path,
        ).observe(duration)

        # Structured JSON logging
        log_data = {
            "request_id": getattr(request.state, "request_id", None),
            "user_id": getattr(request.state, "user_id", None),
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": duration * 1000,
            "remote_addr": request.client.host if request.client else None,
        }
        json_logger.info(json.dumps(log_data))

        return response
