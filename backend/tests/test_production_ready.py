from fastapi.routing import APIRoute
from fastapi.testclient import TestClient
import pytest

from app.config import Settings
from app.database import _engine_kwargs
from app.main import app
from app.middleware import limiter


def test_all_routes_have_explicit_rate_limits() -> None:
    missing: list[str] = []
    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        endpoint = getattr(route.endpoint, "__wrapped__", route.endpoint)
        key = f"{endpoint.__module__}.{endpoint.__name__}"
        if key not in limiter._route_limits:
            missing.append(f"{sorted(route.methods or [])} {route.path}")

    assert not missing, f"Routes missing @limiter.limit decorators: {missing}"


def test_auth_rate_limit_returns_retry_after(client: TestClient) -> None:
    responses = [
        client.post(
            "/api/v1/auth/login",
            json={"email": "missing@example.com", "password": "WrongPassword123!"},
        )
        for _ in range(6)
    ]

    assert [response.status_code for response in responses[:5]] == [401] * 5
    assert responses[-1].status_code == 429
    assert responses[-1].headers.get("Retry-After")
    assert responses[-1].json()["error"] == "RATE_LIMIT_EXCEEDED"


def test_admin_docs_require_admin_token(client: TestClient) -> None:
    assert client.get("/admin/docs").status_code == 401
    assert client.get("/admin/docs", headers={"X-Admin-Token": "wrong"}).status_code == 403

    docs = client.get("/admin/docs", headers={"X-Admin-Token": "test-admin-token-change-in-production"})
    schema = client.get("/admin/openapi.json", headers={"X-Admin-Token": "test-admin-token-change-in-production"})

    assert docs.status_code == 200
    assert "text/html" in docs.headers["content-type"]
    assert schema.status_code == 200
    assert schema.json()["info"]["title"] == "Satellite Tracker"


def test_pagination_limit_over_cap_returns_400(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.get("/api/v1/locations?limit=1000", headers=auth_headers)

    assert response.status_code == 400
    assert response.json()["error"] == "BAD_REQUEST"


def test_paginated_endpoint_returns_envelope(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.get("/api/v1/locations", headers=auth_headers)

    assert response.status_code == 200
    assert response.json() == {"data": [], "count": 0, "skip": 0, "limit": 50}


def test_request_size_limit_returns_413(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.post(
        "/api/v1/locations",
        headers={
            **auth_headers,
            "content-type": "application/json",
            "content-length": str(10 * 1024 * 1024 + 1),
        },
        content=b"{}",
    )

    assert response.status_code == 413
    assert response.json()["error"] == "REQUEST_TOO_LARGE"


def test_satellite_name_injection_marker_rejected(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.get(
        "/api/v1/passes?satellite_name=ISS%3B%20DROP%20TABLE%20users",
        headers=auth_headers,
    )

    assert response.status_code == 400
    assert response.json()["error"] == "BAD_REQUEST"


def test_production_config_rejects_placeholder_secrets() -> None:
    with pytest.raises(ValueError):
        Settings(
            APP_PRODUCTION=True,
            APP_DEBUG=False,
            SECRET_KEY="dev-secret-key-change-in-production-min-32-chars",
            ADMIN_TOKEN="dev-admin-token-change-in-production",
            DB_PASSWORD="tracker_dev_password",
            DATABASE_URL="postgresql+psycopg2://tracker:tracker_dev_password@postgres:5432/satellite_tracker",
            REDIS_URL="redis://redis:6379",
        )


def test_database_pool_kwargs_for_postgres() -> None:
    kwargs = _engine_kwargs("postgresql+psycopg2://tracker:test@postgres:5432/satellite_tracker")

    assert kwargs["pool_size"] >= 20
    assert kwargs["max_overflow"] >= 40
    assert kwargs["pool_recycle"] == 3600
    assert kwargs["connect_args"]["connect_timeout"] == 10


def test_sqlite_engine_kwargs_do_not_use_queue_pool_args() -> None:
    kwargs = _engine_kwargs("sqlite:///./test.db")

    assert "pool_size" not in kwargs
    assert kwargs["connect_args"] == {"check_same_thread": False}
