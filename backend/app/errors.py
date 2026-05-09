from fastapi import Request
from fastapi.responses import JSONResponse


class SatelliteTrackerError(Exception):
    def __init__(self, message: str, code: str = "SATELLITE_TRACKER_ERROR", status_code: int = 400):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


class NotFoundError(SatelliteTrackerError):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, "NOT_FOUND", 404)


class ForbiddenError(SatelliteTrackerError):
    def __init__(self, message: str = "Not allowed"):
        super().__init__(message, "FORBIDDEN", 403)


class InvalidLocationError(SatelliteTrackerError):
    def __init__(self, message: str = "Invalid location"):
        super().__init__(message, "INVALID_LOCATION", 400)


class PredictionError(SatelliteTrackerError):
    def __init__(self, message: str = "Pass prediction failed"):
        super().__init__(message, "PREDICTION_FAILED", 503)


async def satellite_tracker_exception_handler(request: Request, exc: SatelliteTrackerError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.code,
            "message": exc.message,
            "request_id": getattr(request.state, "request_id", None),
        },
    )

