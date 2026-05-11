"""Enhanced error handling with standardized error responses."""

from typing import Any, Dict

from fastapi import Request, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError

from app.errors import SatelliteTrackerError


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


async def validation_exception_handler(request: Request, exc: ValidationError) -> JSONResponse:
    """Handle Pydantic validation errors."""
    error_response = ErrorResponse(
        error="VALIDATION_ERROR",
        message="Request validation failed",
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        request_id=getattr(request.state, "request_id", None),
        details={"fields": [f"{err['loc']}: {err['msg']}" for err in exc.errors()]},
    )
    return JSONResponse(
        status_code=error_response.status_code,
        content=dict(error_response),
    )


async def http_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle generic HTTP exceptions."""
    status_code = getattr(exc, "status_code", status.HTTP_500_INTERNAL_SERVER_ERROR)
    error_response = ErrorResponse(
        error="HTTP_ERROR",
        message=str(exc.detail) if hasattr(exc, "detail") else "An HTTP error occurred",
        status_code=status_code,
        request_id=getattr(request.state, "request_id", None),
    )
    return JSONResponse(
        status_code=error_response.status_code,
        content=dict(error_response),
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
    error_response = ErrorResponse(
        error="INTERNAL_ERROR",
        message="An unexpected error occurred",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        request_id=getattr(request.state, "request_id", None),
    )
    # In production, don't expose the actual error details
    return JSONResponse(
        status_code=error_response.status_code,
        content=dict(error_response),
    )
