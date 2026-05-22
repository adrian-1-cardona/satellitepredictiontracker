"""Admin-protected private API documentation endpoints."""

from fastapi import APIRouter, Depends, Request
from fastapi.openapi.docs import get_redoc_html, get_swagger_ui_html
from fastapi.responses import HTMLResponse

from app.auth import require_admin_token
from app.config import get_settings
from app.middleware import limiter


router = APIRouter(tags=["admin"])
settings = get_settings()


@router.get("/admin/docs", dependencies=[Depends(require_admin_token)])
@limiter.limit("50/minute")
async def admin_docs(request: Request) -> HTMLResponse:
    """Admin-only Swagger documentation."""
    return get_swagger_ui_html(
        openapi_url="/admin/openapi.json",
        title=f"{settings.app_name} API (Admin)",
    )


@router.get("/admin/redoc", dependencies=[Depends(require_admin_token)])
@limiter.limit("50/minute")
async def admin_redoc(request: Request) -> HTMLResponse:
    """Admin-only ReDoc documentation."""
    return get_redoc_html(
        openapi_url="/admin/openapi.json",
        title=f"{settings.app_name} API (Admin ReDoc)",
    )


@router.get("/admin/openapi.json", dependencies=[Depends(require_admin_token)])
@limiter.limit("50/minute")
async def admin_openapi(request: Request) -> dict:
    """Admin-only OpenAPI schema endpoint."""
    return request.app.openapi()
