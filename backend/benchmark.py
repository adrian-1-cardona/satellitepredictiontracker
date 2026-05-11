#!/usr/bin/env python
"""
Benchmark script to measure API endpoint latencies.

Install: pip install requests
Run: python backend/benchmark.py

This will measure and report latency for key endpoints.
"""

import requests
import json
import time
import statistics
from typing import List, Dict, Any


class BenchmarkRunner:
    """Runs benchmarks against the API."""

    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.results: Dict[str, List[float]] = {}
        self.access_token = None

    def setup_auth(self):
        """Register and authenticate."""
        try:
            # Register
            response = self.session.post(
                f"{self.base_url}/api/v1/auth/register",
                json={
                    "email": f"benchmark-{int(time.time())}@test.local",
                    "password": "BenchPassword123!"
                },
                timeout=10
            )

            if response.status_code in [200, 201]:
                data = response.json()
                self.access_token = data.get("access_token", "")
                print("✓ Authentication successful")
            else:
                print("✗ Authentication failed")

        except Exception as e:
            print(f"✗ Authentication error: {e}")

    def measure(self, name: str, method: str, url: str,
                json_data: Any = None, iterations: int = 10,
                timeout: int = 30):
        """Measure endpoint latency."""
        latencies = []
        errors = 0

        headers = {}
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"

        for i in range(iterations):
            try:
                start = time.time()

                if method.upper() == "GET":
                    response = self.session.get(
                        f"{self.base_url}{url}",
                        headers=headers,
                        timeout=timeout
                    )
                elif method.upper() == "POST":
                    response = self.session.post(
                        f"{self.base_url}{url}",
                        json=json_data,
                        headers=headers,
                        timeout=timeout
                    )
                else:
                    continue

                elapsed = (time.time() - start) * 1000  # Convert to ms

                if response.status_code < 400:
                    latencies.append(elapsed)
                else:
                    errors += 1

            except requests.exceptions.Timeout:
                errors += 1
            except Exception as e:
                errors += 1

        if latencies:
            self.results[name] = latencies
            avg = statistics.mean(latencies)
            p95 = statistics.quantiles(latencies, n=20)[18] if len(latencies) > 1 else avg
            p99 = statistics.quantiles(latencies, n=100)[98] if len(latencies) > 1 else avg

            print(f"✓ {name:40} | Avg: {avg:7.1f}ms | p95: {p95:7.1f}ms | p99: {p99:7.1f}ms | Errors: {errors}")
        else:
            print(f"✗ {name:40} | Failed after {errors} errors")

    def run_benchmarks(self):
        """Run all benchmarks."""
        print("\n" + "="*100)
        print("API ENDPOINT LATENCY BENCHMARKS")
        print("="*100 + "\n")

        self.setup_auth()
        print()

        # Health checks
        self.measure("GET /health", "GET", "/health", iterations=20)
        self.measure("GET /ready", "GET", "/ready", iterations=20)

        # Auth endpoints
        self.measure("POST /auth/login", "POST", "/api/v1/auth/login",
                    {"email": "test@test.local", "password": "test123"}, iterations=10)

        # Location endpoints
        self.measure("GET /locations", "GET", "/api/v1/locations", iterations=15)
        self.measure("POST /locations", "POST", "/api/v1/locations",
                    {
                        "name": "Benchmark Location",
                        "latitude": 40.7128,
                        "longitude": -74.0060,
                        "elevation": 10
                    }, iterations=10)

        # Prediction endpoint
        self.measure("POST /passes/predict", "POST", "/api/v1/passes/predict",
                    {
                        "name": "Benchmark Prediction",
                        "latitude": 40.7128,
                        "longitude": -74.0060,
                        "elevation": 10
                    }, iterations=5)

        # Metrics
        self.measure("GET /metrics", "GET", "/metrics", iterations=15)

        self.print_summary()

    def print_summary(self):
        """Print summary statistics."""
        print("\n" + "="*100)
        print("SUMMARY STATISTICS")
        print("="*100 + "\n")

        all_latencies = []
        for latencies in self.results.values():
            all_latencies.extend(latencies)

        if all_latencies:
            print(f"Overall Results:")
            print(f"  Total Measurements: {len(all_latencies)}")
            print(f"  Average Latency: {statistics.mean(all_latencies):.1f}ms")
            print(f"  Median Latency: {statistics.median(all_latencies):.1f}ms")
            print(f"  Min Latency: {min(all_latencies):.1f}ms")
            print(f"  Max Latency: {max(all_latencies):.1f}ms")
            print(f"  Std Dev: {statistics.stdev(all_latencies):.1f}ms" if len(all_latencies) > 1 else "")
            print()


if __name__ == "__main__":
    runner = BenchmarkRunner()
    runner.run_benchmarks()
