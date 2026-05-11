#!/usr/bin/env python
"""
Load testing script for satellite prediction tracker API.

Install: pip install locust
Run: locust -f backend/load_test.py --host=http://localhost:8000

This will start the Locust web UI at http://localhost:8089
"""

from locust import HttpUser, task, between, events
import json
import random
import time


class SatelliteTrackerUser(HttpUser):
    """Simulates user behavior on the satellite tracker API."""

    wait_time = between(1, 3)

    def on_start(self):
        """Called when a test starts - authenticate first."""
        # Try to register/login
        email = f"user-{random.randint(1000, 9999)}@test.local"
        password = "TestPassword123!"

        # Register
        response = self.client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": password},
            catch_response=True
        )

        if response.status_code in [200, 201]:
            data = response.json()
            self.access_token = data.get("access_token")
        else:
            # Try login instead
            response = self.client.post(
                "/api/v1/auth/login",
                json={"email": email, "password": password},
                catch_response=True
            )
            if response.status_code in [200, 201]:
                data = response.json()
                self.access_token = data.get("access_token")
            else:
                self.access_token = "test-token"  # Fallback

        self.headers = {"Authorization": f"Bearer {self.access_token}"}

    @task(3)
    def get_health(self):
        """Health check - most frequent task."""
        self.client.get("/health")

    @task(2)
    def get_locations(self):
        """Get user's saved locations."""
        self.client.get(
            "/api/v1/locations",
            headers=self.headers,
            catch_response=True
        )

    @task(1)
    def predict_satellite_pass(self):
        """Predict satellite pass for a location."""
        # Create or use a location
        location_data = {
            "name": f"Test Location {random.randint(100, 999)}",
            "latitude": random.uniform(-90, 90),
            "longitude": random.uniform(-180, 180),
            "elevation": random.uniform(0, 3000)
        }

        self.client.post(
            "/api/v1/passes/predict",
            json=location_data,
            headers=self.headers,
            catch_response=True
        )

    @task(1)
    def get_metrics(self):
        """Get Prometheus metrics."""
        self.client.get("/metrics")


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Called when the test starts."""
    print("\n" + "="*60)
    print("Starting Satellite Tracker API Load Test")
    print("="*60 + "\n")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Called when the test stops."""
    print("\n" + "="*60)
    print("Load Test Completed")
    print("="*60)
    print(f"\nResults Summary:")
    print(f"  Total Requests: {environment.stats.total.num_requests}")
    print(f"  Total Failures: {environment.stats.total.num_failures}")
    print(f"  Average Response Time: {environment.stats.total.avg_response_time:.0f}ms")
    print(f"  Min Response Time: {environment.stats.total.min_response_time:.0f}ms")
    print(f"  Max Response Time: {environment.stats.total.max_response_time:.0f}ms")
