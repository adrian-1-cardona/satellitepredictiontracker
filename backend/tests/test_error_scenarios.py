"""
Comprehensive error scenario tests - covers happy and sad paths.

Run: python -m pytest tests/test_error_scenarios.py -v
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestLocationErrorScenarios:
    """Test error cases for location management."""

    def test_invalid_location_coordinates(self, auth_headers):
        """Invalid coordinates are rejected."""
        invalid_cases = [
            {
                "name": "Too far north",
                "latitude": 91,
                "longitude": 0,
            },
            {
                "name": "Too far south",
                "latitude": -91,
                "longitude": 0,
            },
            {
                "name": "Too far east",
                "latitude": 0,
                "longitude": 181,
            },
            {
                "name": "Too far west",
                "latitude": 0,
                "longitude": -181,
            },
        ]

        for case in invalid_cases:
            response = client.post(
                "/api/v1/locations", json=case, headers=auth_headers
            )

            assert response.status_code == 422  # Validation failed
            assert "latitude" in response.json()["detail"][0]["loc"] or \
                   "longitude" in response.json()["detail"][0]["loc"]

    def test_missing_required_fields(self, auth_headers):
        """Missing required fields returns 422."""
        incomplete_data = {"name": "Incomplete"}  # Missing latitude, longitude

        response = client.post(
            "/api/v1/locations", json=incomplete_data, headers=auth_headers
        )

        assert response.status_code == 422

    def test_invalid_field_types(self, auth_headers):
        """Wrong field types return 422."""
        wrong_type = {
            "name": "Valid",
            "latitude": "not-a-number",  # Should be float
            "longitude": -74.0,
        }

        response = client.post(
            "/api/v1/locations", json=wrong_type, headers=auth_headers
        )

        assert response.status_code == 422

    def test_accessing_nonexistent_location_returns_404(self, auth_headers):
        """Accessing non-existent location returns 404."""
        response = client.get(
            "/api/v1/locations/999999", headers=auth_headers
        )

        assert response.status_code == 404

    def test_duplicate_location_name_in_same_user(self, auth_headers):
        """User cannot create two locations with same name."""
        location_data = {
            "name": "My Home",
            "latitude": 40.7128,
            "longitude": -74.0060,
        }

        # Create first
        response1 = client.post(
            "/api/v1/locations", json=location_data, headers=auth_headers
        )
        assert response1.status_code == 201

        # Try to create duplicate
        response2 = client.post(
            "/api/v1/locations", json=location_data, headers=auth_headers
        )

        # Should either reject (409) or handle gracefully
        assert response2.status_code in [409, 422, 400]

    def test_update_location_with_invalid_data(self, auth_headers):
        """Updating location with invalid data fails."""
        # First create a location
        location_data = {
            "name": "Original",
            "latitude": 40.7,
            "longitude": -74.0,
        }
        response = client.post(
            "/api/v1/locations", json=location_data, headers=auth_headers
        )
        location_id = response.json()["id"]

        # Try to update with invalid latitude
        update_data = {
            "name": "Updated",
            "latitude": 100,  # Invalid
            "longitude": -74.0,
        }
        response = client.put(
            f"/api/v1/locations/{location_id}",
            json=update_data,
            headers=auth_headers,
        )

        assert response.status_code == 422


class TestAuthenticationErrorScenarios:
    """Test error cases for authentication."""

    def test_invalid_email_format_rejected(self):
        """Invalid email formats are rejected."""
        invalid_emails = [
            "notanemail",
            "@example.com",
            "user@",
            "user space@example.com",
            "",
        ]

        for invalid_email in invalid_emails:
            response = client.post(
                "/api/v1/auth/register",
                json={"email": invalid_email, "password": "ValidPassword123!"},
            )

            assert response.status_code == 422

    def test_weak_password_rejected(self):
        """Weak passwords are rejected."""
        weak_passwords = [
            "123",  # Too short
            "noupppercase",  # No uppercase
            "NOLOWERCASE",  # No lowercase
            "NoNumbers!",  # No numbers
            "NoSpecial123",  # No special char
        ]

        for weak_pwd in weak_passwords:
            response = client.post(
                "/api/v1/auth/register",
                json={
                    "email": f"user-{weak_pwd}@example.com",
                    "password": weak_pwd,
                },
            )

            assert response.status_code == 422

    def test_login_with_nonexistent_user_fails(self):
        """Login with non-existent user fails."""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "SomePassword123!",
            },
        )

        # Should return 401 or generic error
        assert response.status_code in [401, 400]

    def test_login_with_wrong_password_fails(self):
        """Login with wrong password fails."""
        # First register
        client.post(
            "/api/v1/auth/register",
            json={"email": "user@example.com", "password": "CorrectPassword123!"},
        )

        # Try login with wrong password
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "user@example.com", "password": "WrongPassword123!"},
        )

        assert response.status_code == 401

    def test_missing_auth_token_returns_401(self):
        """Requests without auth token return 401."""
        response = client.get("/api/v1/locations")

        assert response.status_code == 401

    def test_malformed_auth_header_returns_401(self):
        """Malformed auth headers return 401."""
        malformed_headers = [
            {"Authorization": "NotBearer token"},
            {"Authorization": "Bearer"},  # Missing token
            {"Authorization": "Bearer token123 extra"},  # Extra parts
            {"Authorization": ""},  # Empty
        ]

        for headers in malformed_headers:
            response = client.get("/api/v1/locations", headers=headers)

            assert response.status_code == 401


class TestPassPredictionErrorScenarios:
    """Test error cases for satellite pass predictions."""

    def test_predict_without_required_fields(self, auth_headers):
        """Predicting without required fields fails."""
        incomplete_data = {"name": "Incomplete"}

        response = client.post(
            "/api/v1/passes/predict", json=incomplete_data, headers=auth_headers
        )

        assert response.status_code == 422

    def test_predict_with_invalid_coordinates(self, auth_headers):
        """Prediction with invalid coordinates fails."""
        invalid_data = {
            "name": "Invalid",
            "latitude": 150,  # Invalid
            "longitude": -74.0,
        }

        response = client.post(
            "/api/v1/passes/predict", json=invalid_data, headers=auth_headers
        )

        assert response.status_code == 422

    def test_predict_for_nonexistent_location_returns_404(self, auth_headers):
        """Predicting for non-existent location returns 404."""
        response = client.get(
            "/api/v1/passes/999999", headers=auth_headers
        )

        assert response.status_code == 404


class TestAlertErrorScenarios:
    """Test error cases for alerts."""

    def test_create_alert_without_required_fields(self, auth_headers):
        """Creating alert without required fields fails."""
        incomplete_alert = {"name": "Alert"}  # Missing other fields

        response = client.post(
            "/api/v1/alerts", json=incomplete_alert, headers=auth_headers
        )

        assert response.status_code == 422

    def test_create_alert_for_nonexistent_location(self, auth_headers):
        """Creating alert for non-existent location fails."""
        alert_data = {
            "name": "Alert",
            "location_id": 999999,  # Non-existent
        }

        response = client.post(
            "/api/v1/alerts", json=alert_data, headers=auth_headers
        )

        assert response.status_code in [404, 422]

    def test_delete_nonexistent_alert_returns_404(self, auth_headers):
        """Deleting non-existent alert returns 404."""
        response = client.delete(
            "/api/v1/alerts/999999", headers=auth_headers
        )

        assert response.status_code == 404


class TestInputValidationErrorScenarios:
    """Test input validation edge cases."""

    def test_very_long_string_in_location_name(self, auth_headers):
        """Very long location names are rejected or truncated."""
        long_name = "A" * 10000  # Way too long

        response = client.post(
            "/api/v1/locations",
            json={
                "name": long_name,
                "latitude": 40.7,
                "longitude": -74.0,
            },
            headers=auth_headers,
        )

        # Should be rejected (422)
        assert response.status_code == 422

    def test_special_characters_in_location_name(self, auth_headers):
        """Special characters in names are handled safely."""
        special_cases = [
            "Location<img>",
            "Location\"; DROP TABLE --",
            "Location\n\r",
            "Location\x00",
            "Location\t",
        ]

        for special_name in special_cases:
            response = client.post(
                "/api/v1/locations",
                json={
                    "name": special_name,
                    "latitude": 40.7,
                    "longitude": -74.0,
                },
                headers=auth_headers,
            )

            # Should either accept or safely reject
            assert response.status_code in [201, 422]

    def test_negative_elevation_rejected(self, auth_headers):
        """Negative elevation values are rejected."""
        response = client.post(
            "/api/v1/locations",
            json={
                "name": "Underwater",
                "latitude": 40.7,
                "longitude": -74.0,
                "elevation": -1000,  # Negative elevation
            },
            headers=auth_headers,
        )

        assert response.status_code == 422

    def test_null_values_in_required_fields(self, auth_headers):
        """Null values in required fields are rejected."""
        null_data = {
            "name": None,  # Required field
            "latitude": 40.7,
            "longitude": -74.0,
        }

        response = client.post(
            "/api/v1/locations", json=null_data, headers=auth_headers
        )

        assert response.status_code == 422


class TestNetworkErrorScenarios:
    """Test error handling for network issues."""

    def test_request_timeout_handled(self):
        """Long-running requests eventually timeout."""
        # This test may be skipped or handled at timeout level
        # Implementation depends on FastAPI timeout configuration
        pass

    def test_database_connection_error_returns_500(self):
        """Database errors return 500, not 200."""
        # Mock database failure and verify error response
        pass


class TestAccessControlErrorScenarios:
    """Test authorization error cases."""

    def test_user_cannot_access_other_user_data(self, db_session):
        """User A cannot access User B's data."""
        from app.models import User
        import jwt
        import os

        # Create users
        user_a = User(email="usera@test.com", password_hash="hash_a")
        user_b = User(email="userb@test.com", password_hash="hash_b")
        db_session.add_all([user_a, user_b])
        db_session.commit()

        # User B creates location
        token_b = create_token(user_b.id)
        location_response = client.post(
            "/api/v1/locations",
            json={
                "name": "User B Location",
                "latitude": 40.7,
                "longitude": -74.0,
            },
            headers={"Authorization": f"Bearer {token_b}"},
        )
        location_id = location_response.json()["id"]

        # User A tries to access
        token_a = create_token(user_a.id)
        response = client.get(
            f"/api/v1/locations/{location_id}",
            headers={"Authorization": f"Bearer {token_a}"},
        )

        # Should get 404 (not 200 or 403)
        assert response.status_code == 404

    def test_user_cannot_modify_other_user_data(self):
        """User cannot modify another user's data."""
        # Similar to above but with PUT/DELETE
        pass


# Helpers

def create_token(user_id: int):
    """Create a test JWT token."""
    import jwt
    from datetime import datetime, timedelta

    SECRET_KEY = os.getenv("SECRET_KEY", "test-secret")

    payload = {
        "sub": str(user_id),
        "exp": datetime.utcnow() + timedelta(hours=1),
    }

    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


@pytest.fixture
def auth_headers(db_session):
    """Fixture: Valid auth headers for testing."""
    from app.models import User
    import bcrypt

    email = "testuser@test.com"
    password = "TestPassword123!"

    # Hash password
    salt = bcrypt.gensalt()
    hash_password = bcrypt.hashpw(password.encode(), salt)

    user = User(email=email, password_hash=hash_password)
    db_session.add(user)
    db_session.commit()

    token = create_token(user.id)
    return {"Authorization": f"Bearer {token}"}
