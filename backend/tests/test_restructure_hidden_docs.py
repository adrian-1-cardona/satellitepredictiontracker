"""Property-based test for hidden documentation endpoints.

# Feature: backend-frontend-restructure, Property 3

Property 3: Hidden Documentation Endpoints Return 404.

For any HTTP method ``m`` in ``HTTP_METHODS`` and any path ``p`` in
``DOC_PATH_VARIANTS``, the live FastAPI app returns HTTP status ``404`` for
``m p``, and the response body does not contain HTML that would be emitted
by Swagger UI or ReDoc.

Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 10.5
"""

from __future__ import annotations

from typing import Generator

import pytest
from fastapi.testclient import TestClient
from hypothesis import given, settings
from hypothesis import strategies as st

from app.main import app
from restructure_manifests import DOC_PATH_VARIANTS, HTTP_METHODS

# HTML markers that Swagger UI / ReDoc would emit. If any of these appears in
# a 404 response body it would indicate the docs pages are still being served.
_FORBIDDEN_DOC_MARKERS = [
    "swagger-ui",
    "redoc",
    "<title>swagger",
]


@pytest.fixture(scope="module")
def docs_client() -> Generator[TestClient, None, None]:
    """Module-scoped TestClient for the FastAPI app.

    Using a module-scoped client keeps the property test fast across the 100
    Hypothesis examples. The app does not need database overrides here because
    the tested endpoints never touch the database.
    """
    with TestClient(app) as test_client:
        yield test_client


@given(
    method=st.sampled_from(HTTP_METHODS),
    path=st.sampled_from(DOC_PATH_VARIANTS),
)
@settings(max_examples=100)
def test_doc_endpoints_return_404_without_swagger_or_redoc_markers(
    docs_client: TestClient, method: str, path: str
) -> None:
    """Every (method, path) pair against /docs, /redoc, /openapi.json yields 404.

    # Feature: backend-frontend-restructure, Property 3
    # Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 10.5
    """
    response = docs_client.request(method, path)

    assert response.status_code == 404, (
        f"Expected 404 for {method} {path}, got {response.status_code}"
    )

    body_lower = response.text.lower()
    for marker in _FORBIDDEN_DOC_MARKERS:
        assert marker not in body_lower, (
            f"Response for {method} {path} contains forbidden marker {marker!r}; "
            "docs endpoints appear to still be registered."
        )
