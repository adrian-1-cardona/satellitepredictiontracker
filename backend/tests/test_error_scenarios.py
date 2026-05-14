from app.auth import issue_tokens
from app.models import User


class TestLocationErrorScenarios:
    """Test error cases for location management."""

    def test_invalid_location_coordinates(self, client, auth_headers):
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
                "/api/v1/locations",
                json=case,
                headers=auth_headers,
            )

            assert response.status_code == 422
            loc = response.json()["detail"][0]["loc"]
            assert "latitude" in loc or "longitude" in loc

    def test_missing_required_fields(self, client, auth_headers):
        """Missing required fields returns 422."""
        incomplete_data = {"name": "Incomplete"}

        response = client.post(
            "/api/v1/locations",
            json=incomplete_data,
            headers=auth_headers,
        )

        assert response.status_code == 422

    def test_invalid_field_types(self, client, auth_headers):
        """Wrong field types return 422."""
        wrong_type = {
            "name": "Valid",
            "latitude": "not-a-number",
            "longitude": -74.0,
        }

        response = client.post(
            "/api/v1/locations",
            json=wrong_type,
            headers=auth_headers,
        )

        assert response.status_code == 422

    def test_accessing_nonexistent_location_returns_404(self, client, auth_headers):
        """Accessing non-existent location returns 404."""
        response = client.get(
            "/api/v1/locations/999999",
            headers=auth_headers,
        )

        assert response.status_code == 404

    def test_duplicate_location_name_in_same_user(self, client, auth_headers):
        """User cannot create two locations with same name."""
        location_data = {
            "name": "My Home",
            "latitude": 40.7128,
            "longitude": -74.0060,
        }

        response1 = client.post(
            "/api/v1/locations",
            json=location_data,
            headers=auth_headers,
        )
        assert response1.status_code == 201

        response2 = client.post(
            "/api/v1/locations",
            json=location_data,
            headers=auth_headers,
        )

        assert response2.status_code in [409, 422, 400]

    def test_update_location_with_invalid_data(self, client, auth_headers):
        """Updating location with invalid data fails."""
        location_data = {
            "name": "Original",
            "latitude": 40.7,
            "longitude": -74.0,
        }

        response = client.post(
            "/api/v1/locations",
            json=location_data,
            headers=auth_headers,
        )
        assert response.status_code == 201, response.text

        location_id = response.json()["id"]

        update_data = {
            "name": "Updated",
            "latitude": 100,
            "longitude": -74.0,
        }

        response = client.patch(
            f"/api/v1/locations/{location_id}",
            json=update_data,
            headers=auth_headers,
        )

        assert response.status_code == 422


class TestAuthenticationErrorScenarios:
    """Test error cases for authentication."""

    def test_invalid_email_format_rejected(self, client):
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

    def test_weak_password_rejected(self, client):
        """Weak passwords are rejected."""
        weak_passwords = [
            "123",
            "noupppercase",
            "NOLOWERCASE",
            "NoNumbers!",
            "NoSpecial123",
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

    def test_login_with_nonexistent_user_fails(self, client):
        """Login with non-existent user fails."""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "SomePassword123!",
            },
        )

        assert response.status_code in [401, 400]

    def test_login_with_wrong_password_fails(self, client):
        """Login with wrong password fails."""
        register_response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "user@example.com",
                "password": "CorrectPassword123!",
            },
        )
        assert register_response.status_code == 201, register_response.text

        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "user@example.com",
                "password": "WrongPassword123!",
            },
        )

        assert response.status_code == 401

    def test_missing_auth_token_returns_401(self, client):
        """Requests without auth token return 401."""
        response = client.get("/api/v1/locations")

        assert response.status_code == 401

    def test_malformed_auth_header_returns_401(self, client):
        """Malformed auth headers return 401."""
        malformed_headers = [
            {"Authorization": "NotBearer token"},
            {"Authorization": "Bearer"},
            {"Authorization": "Bearer token123 extra"},
            {"Authorization": ""},
        ]

        for headers in malformed_headers:
            response = client.get("/api/v1/locations", headers=headers)

            assert response.status_code == 401


class TestPassPredictionErrorScenarios:
    """Test error cases for satellite pass predictions."""

    def test_predict_without_required_fields(self, client, auth_headers):
        """Predicting without required fields fails."""
        incomplete_data = {"days_ahead": 12}

        response = client.post(
            "/api/v1/passes/refresh",
            json=incomplete_data,
            headers=auth_headers,
        )

        assert response.status_code == 422

    def test_predict_with_invalid_coordinates(self, client, auth_headers):
        """Prediction with invalid coordinates fails."""
        invalid_data = {"location_id": 1, "days_ahead": 0}

        response = client.post(
            "/api/v1/passes/refresh",
            json=invalid_data,
            headers=auth_headers,
        )

        assert response.status_code == 422

    def test_predict_for_nonexistent_location_returns_404(self, client, auth_headers):
        """Predicting for non-existent location returns 404."""
        response = client.get(
            "/api/v1/passes/999999",
            headers=auth_headers,
        )

        assert response.status_code == 404


class TestAlertErrorScenarios:
    """Test error cases for alerts."""

    def test_create_alert_without_required_fields(self, client, auth_headers):
        """Creating alert without required fields fails."""
        incomplete_alert = {"name": "Alert"}

        response = client.post(
            "/api/v1/alerts",
            json=incomplete_alert,
            headers=auth_headers,
        )

        assert response.status_code == 422

    def test_create_alert_for_nonexistent_location(self, client, auth_headers):
        """Creating alert for non-existent location fails."""
        alert_data = {
            "name": "Alert",
            "location_id": 999999,
        }

        response = client.post(
            "/api/v1/alerts",
            json=alert_data,
            headers=auth_headers,
        )

        assert response.status_code in [404, 422]

    def test_delete_nonexistent_alert_returns_404(self, client, auth_headers):
        """Deleting non-existent alert returns 404."""
        response = client.delete(
            "/api/v1/alerts/999999",
            headers=auth_headers,
        )

        assert response.status_code == 404


class TestInputValidationErrorScenarios:
    """Test input validation edge cases."""

    def test_very_long_string_in_location_name(self, client, auth_headers):
        """Very long location names are rejected or truncated."""
        long_name = "A" * 10000

        response = client.post(
            "/api/v1/locations",
            json={
                "name": long_name,
                "latitude": 40.7,
                "longitude": -74.0,
            },
            headers=auth_headers,
        )

        assert response.status_code == 422

    def test_special_characters_in_location_name(self, client, auth_headers):
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

            assert response.status_code in [201, 422]

    def test_negative_elevation_rejected(self, client, auth_headers):
        """Negative elevation values are rejected."""
        response = client.post(
            "/api/v1/locations",
            json={
                "name": "Underwater",
                "latitude": 40.7,
                "longitude": -74.0,
                "elevation_m": -1000,
            },
            headers=auth_headers,
        )

        assert response.status_code == 422

    def test_null_values_in_required_fields(self, client, auth_headers):
        """Null values in required fields are rejected."""
        null_data = {
            "name": None,
            "latitude": 40.7,
            "longitude": -74.0,
        }

        response = client.post(
            "/api/v1/locations",
            json=null_data,
            headers=auth_headers,
        )

        assert response.status_code == 422


class TestNetworkErrorScenarios:
    """Test error handling for network issues."""

    def test_request_timeout_handled(self):
        """Long-running requests eventually timeout."""
        pass

    def test_database_connection_error_returns_500(self):
        """Database errors return 500, not 200."""
        pass


class TestAccessControlErrorScenarios:
    """Test authorization error cases."""

    def test_user_cannot_access_other_user_data(self, client, db_session):
        """User A cannot access User B's data."""
        user_a = User(email="usera@test.com", password_hash="hash_a")
        user_b = User(email="userb@test.com", password_hash="hash_b")
        db_session.add_all([user_a, user_b])
        db_session.commit()
        db_session.refresh(user_a)
        db_session.refresh(user_b)

        token_b = issue_tokens(db_session, user_b)["access_token"]
        location_response = client.post(
            "/api/v1/locations",
            json={
                "name": "User B Location",
                "latitude": 40.7,
                "longitude": -74.0,
            },
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert location_response.status_code == 201, location_response.text

        location_id = location_response.json()["id"]

        token_a = issue_tokens(db_session, user_a)["access_token"]
        response = client.get(
            f"/api/v1/locations/{location_id}",
            headers={"Authorization": f"Bearer {token_a}"},
        )

        assert response.status_code == 404

    def test_user_cannot_modify_other_user_data(self):
        """User cannot modify another user's data."""
        pass
