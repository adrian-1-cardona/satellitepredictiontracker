from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

import app.routers.locations as location_router
import app.routers.passes as passes_router
from app.database import SessionLocal
from app.models import Location, SatellitePass


def test_auth_flow_and_protected_route(client: TestClient) -> None:
    protected = client.get("/api/v1/locations")
    assert protected.status_code == 401

    register = client.post(
        "/api/v1/auth/register",
        json={"email": "flow@example.com", "password": "SecurePass123!"},
    )
    assert register.status_code == 201
    body = register.json()
    assert body["access_token"]
    assert body["refresh_token"]

    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.status_code == 200
    assert me.json()["email"] == "flow@example.com"

    refresh = client.post("/api/v1/auth/refresh", json={"refresh_token": body["refresh_token"]})
    assert refresh.status_code == 200
    assert refresh.json()["access_token"] != body["access_token"]


def test_location_pass_and_alert_smoke(client: TestClient, auth_headers: dict[str, str], monkeypatch) -> None:
    monkeypatch.setattr(location_router, "enqueue_prediction", lambda location_id: "test-task")
    monkeypatch.setattr(passes_router, "enqueue_prediction", lambda location_id: "test-task")

    create_location = client.post(
        "/api/v1/locations",
        headers=auth_headers,
        json={"name": "NYC", "latitude": 40.7128, "longitude": -74.0060, "elevation_m": 10},
    )
    assert create_location.status_code == 201
    location_id = create_location.json()["id"]

    db = SessionLocal()
    try:
        location = db.get(Location, location_id)
        db.add(
            SatellitePass(
                location_id=location.id,
                satellite_name="ISS (ZARYA)",
                rise_time=datetime.now(timezone.utc) + timedelta(hours=2),
                culmination_time=datetime.now(timezone.utc) + timedelta(hours=2, minutes=5),
                set_time=datetime.now(timezone.utc) + timedelta(hours=2, minutes=10),
                max_elevation=55,
                brightness=0.8,
                pass_quality="good",
                expires_at=datetime.now(timezone.utc) + timedelta(days=12),
            )
        )
        db.commit()
    finally:
        db.close()

    passes = client.get(f"/api/v1/passes?location_id={location_id}", headers=auth_headers)
    assert passes.status_code == 200
    assert passes.json()["count"] == 1
    assert len(passes.json()["data"]) == 1

    refresh = client.post(
        "/api/v1/passes/refresh",
        headers=auth_headers,
        json={"location_id": location_id, "days_ahead": 12},
    )
    assert refresh.status_code == 200
    assert "test-task" in refresh.json()["message"]

    alert = client.post(
        "/api/v1/alerts",
        headers=auth_headers,
        json={"location_id": location_id, "min_elevation": 30, "notification_method": "email"},
    )
    assert alert.status_code == 201
    alert_id = alert.json()["id"]

    list_alerts = client.get("/api/v1/alerts", headers=auth_headers)
    assert list_alerts.status_code == 200
    assert list_alerts.json()["count"] == 1
    assert len(list_alerts.json()["data"]) == 1

    update_alert = client.patch("/api/v1/alerts/%s" % alert_id, headers=auth_headers, json={"enabled": False})
    assert update_alert.status_code == 200
    assert update_alert.json()["enabled"] is False

    history = client.get("/api/v1/alerts/history", headers=auth_headers)
    assert history.status_code == 200
    assert history.json()["data"] == []

    health = client.get("/health")
    ready = client.get("/ready")
    assert health.status_code == 200
    assert ready.status_code == 200
    assert ready.json()["ready"] is True
