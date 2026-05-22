"""Enhanced error handling with standardized error responses."""

import logging
from typing import Any, Dict

from fastapi import HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from sqlalchemy.exc import SQLAlchemyError

from app.config import get_settings
from app.errors import SatelliteTrackerError


logger = logging.getLogger(__name__)


class ErrorResponse(dict):
    """Standard error response format."""

    def __init__(
        self,
        error: str,
        message: str,
        status_code: int = 400,
        request_id: str | None = None,
        details: Dict[str, Any] | None = None,
    ):
        super().__init__(
            error=error,
            message=message,
            request_id=request_id,
            details=details or {},
        )
        self.status_code = status_code


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle Pydantic validation errors."""
    error_response = ErrorResponse(
        error="VALIDATION_ERROR",
        message="Request validation failed",
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        request_id=getattr(request.state, "request_id", None),
        details={"fields": jsonable_encoder(exc.errors())},
    )
    return JSONResponse(
        status_code=error_response.status_code,
        content=dict(error_response),
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle generic HTTP exceptions."""
    error_response = ErrorResponse(
        error=_http_error_code(exc.status_code),
        message=str(exc.detail),
        status_code=exc.status_code,
        request_id=getattr(request.state, "request_id", None),
    )
    return JSONResponse(
        status_code=error_response.status_code,
        content=dict(error_response),
        headers=exc.headers,
    )


async def satellite_tracker_exception_handler(request: Request, exc: SatelliteTrackerError) -> JSONResponse:
    """Handle SatelliteTrackerError exceptions."""
    error_response = ErrorResponse(
        error=exc.code,
        message=exc.message,
        status_code=exc.status_code,
        request_id=getattr(request.state, "request_id", None),
    )
    return JSONResponse(
        status_code=error_response.status_code,
        content=dict(error_response),
    )


async def database_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    """Handle database errors."""
    logger.exception("Database error", extra={"request_id": getattr(request.state, "request_id", None)})
    error_response = ErrorResponse(
        error="DATABASE_ERROR",
        message="A database error occurred. Please try again later.",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        request_id=getattr(request.state, "request_id", None),
    )
    # In production, don't expose the actual DB error
    return JSONResponse(
        status_code=error_response.status_code,
        content=dict(error_response),
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler for unhandled exceptions."""
    settings = get_settings()
    logger.exception("Unhandled exception", extra={"request_id": getattr(request.state, "request_id", None)})
    error_response = ErrorResponse(
        error="INTERNAL_ERROR",
        message="An unexpected error occurred" if settings.production else str(exc),
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        request_id=getattr(request.state, "request_id", None),
    )
    return JSONResponse(
        status_code=error_response.status_code,
        content=dict(error_response),
    )


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Handle slowapi rate limit errors with the project error envelope."""
    error_response = ErrorResponse(
        error="RATE_LIMIT_EXCEEDED",
        message=f"Rate limit exceeded: {exc.detail}",
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        request_id=getattr(request.state, "request_id", None),
        details={"limit": str(exc.detail)},
    )
    response = JSONResponse(status_code=error_response.status_code, content=dict(error_response))
    view_rate_limit = getattr(request.state, "view_rate_limit", None)
    if view_rate_limit is not None:
        response = request.app.state.limiter._inject_headers(response, view_rate_limit)
    response.headers.setdefault("Retry-After", "60")
    return response


def _http_error_code(status_code: int) -> str:
    return {
        status.HTTP_400_BAD_REQUEST: "BAD_REQUEST",
        status.HTTP_401_UNAUTHORIZED: "UNAUTHORIZED",
        status.HTTP_403_FORBIDDEN: "FORBIDDEN",
        status.HTTP_404_NOT_FOUND: "NOT_FOUND",
        status.HTTP_409_CONFLICT: "CONFLICT",
        status.HTTP_413_REQUEST_ENTITY_TOO_LARGE: "REQUEST_TOO_LARGE",
        status.HTTP_422_UNPROCESSABLE_ENTITY: "VALIDATION_ERROR",
        status.HTTP_429_TOO_MANY_REQUESTS: "RATE_LIMIT_EXCEEDED",
        status.HTTP_503_SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
    }.get(status_code, "HTTP_ERROR")
