"""Admin-protected private API documentation endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse

from app.auth import get_current_user
from app.config import get_settings


router = APIRouter(tags=["admin"])
settings = get_settings()


async def verify_admin_token(token: str = Query(...)):
    """Verify admin token for private docs access."""
    if not settings.admin_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin documentation is not configured",
        )
    if token != settings.admin_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid admin token",
        )


@router.get("/admin/docs", dependencies=[Depends(verify_admin_token)])
async def admin_docs():
    """Admin-only Swagger documentation."""
    return {
        "title": "Satellite Tracker API (Admin)",
        "version": settings.app_version,
        "message": "Admin documentation endpoint",
    }


@router.get("/admin/redoc", dependencies=[Depends(verify_admin_token)])
async def admin_redoc():
    """Admin-only ReDoc documentation."""
    return {
        "title": "Satellite Tracker API (Admin ReDoc)",
        "version": settings.app_version,
        "message": "Admin ReDoc endpoint",
    }


@router.get("/admin/openapi.json", dependencies=[Depends(verify_admin_token)])
async def admin_openapi(app):
    """Admin-only OpenAPI schema endpoint."""
    if not hasattr(app, "openapi_schema") or app.openapi_schema is None:
        return {"error": "OpenAPI schema not available"}
    return app.openapi_schema
