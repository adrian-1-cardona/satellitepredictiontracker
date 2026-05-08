import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite:///./test_satellite_tracker.db"
os.environ["SECRET_KEY"] = "test-secret-key-change-in-production-min-32-chars"

import app.database as database
import app.models  # noqa: F401

database.configure_database(os.environ["DATABASE_URL"])

from app.database import Base, get_db
from app.main import app


@pytest.fixture(autouse=True)
def reset_database() -> Generator[None, None, None]:
    Base.metadata.drop_all(bind=database.engine)
    Base.metadata.create_all(bind=database.engine)
    yield
    Base.metadata.drop_all(bind=database.engine)


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    def override_get_db():
        db = database.SessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def auth_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "test@example.com", "password": "SecurePass123!"},
    )
    assert response.status_code == 201
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

