"""Contract tests for the operational endpoints: /health, /ready, /metrics.

These tests verify that the FastAPI app continues to honor the contracts
defined in Requirements 2.2, 2.3, 2.4, and 2.5 after the backend restructure.
"""

from fastapi.testclient import TestClient


def test_health_contract(client: TestClient) -> None:
    """GET /health returns 200 with keys: status, version, timestamp.

    Validates: Requirement 2.2
    """
    response = client.get("/health")
    assert response.status_code == 200

    body = response.json()
    assert isinstance(body, dict)
    for key in ("status", "version", "timestamp"):
        assert key in body, f"/health response missing key {key!r}: {body!r}"


def test_ready_contract(client: TestClient) -> None:
    """GET /ready returns 200 with ready == True when DB check succeeds.

    The conftest fixture configures SQLite, so `SELECT 1` succeeds and
    the route should report readiness.

    Validates: Requirements 2.3, 2.4
    """
    response = client.get("/ready")
    assert response.status_code == 200

    body = response.json()
    assert isinstance(body, dict)
    assert body.get("ready") is True, f"/ready response missing ready=True: {body!r}"


def test_metrics_requires_admin_token(client: TestClient) -> None:
    """GET /metrics rejects unauthenticated requests."""
    response = client.get("/metrics")
    assert response.status_code == 401


def test_metrics_contract(client: TestClient) -> None:
    """GET /metrics returns 200 with Prometheus text/plain for admin-token requests.

    Prometheus `CONTENT_TYPE_LATEST` is typically
    ``text/plain; version=0.0.4; charset=utf-8``.

    Validates: Requirement 2.5
    """
    response = client.get("/metrics", headers={"X-Admin-Token": "test-admin-token-change-in-production"})
    assert response.status_code == 200

    content_type = response.headers.get("content-type", "")
    assert "text/plain" in content_type, (
        f"/metrics content-type does not contain 'text/plain': {content_type!r}"
    )
    assert "version=" in content_type, (
        f"/metrics content-type does not contain 'version=': {content_type!r}"
    )
