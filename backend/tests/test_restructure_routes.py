"""Property-based test for API route parity under ``/api/v1``.

Feature: backend-frontend-restructure
Property 2: API Route Parity Under /api/v1

Validates: Requirements 2.1, 3.7, 10.4

For every ``(method, path)`` pair in the pre-move
:data:`REFERENCE_ROUTE_MANIFEST` the live post-move FastAPI app must register
a matching route with that exact method and path; and for every
``(method, path)`` registered on the live app under ``/api/v1/*``, that pair
must be present in the reference manifest (bidirectional parity).

The reference manifest is the canonical snapshot captured in ``design.md``
(``preservedEndpoints``) and exported from
:mod:`restructure_manifests`. Health, ready, and metrics live outside
``/api/v1`` and are intentionally excluded from this property.
"""

from __future__ import annotations

from fastapi.routing import APIRoute
from hypothesis import given, settings
from hypothesis import strategies as st

from app.main import app
from restructure_manifests import REFERENCE_ROUTE_MANIFEST


# HEAD and OPTIONS may be registered automatically by FastAPI/Starlette and
# are not part of the reference manifest, so they are excluded from the live
# set used for parity checks.
_AUTO_METHODS: frozenset[str] = frozenset({"HEAD", "OPTIONS"})


def _live_v1_routes() -> set[tuple[str, str]]:
    """Collect ``(method, path)`` tuples registered under ``/api/v1/*``.

    Only :class:`fastapi.routing.APIRoute` instances are considered; mounts,
    websocket routes, and Starlette's default 404 route are ignored. HEAD and
    OPTIONS methods are filtered out because FastAPI/Starlette may register
    them implicitly.
    """
    live: set[tuple[str, str]] = set()
    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        if not route.path.startswith("/api/v1"):
            continue
        for method in route.methods or set():
            if method in _AUTO_METHODS:
                continue
            live.add((method, route.path))
    return live


# Computed once at import time: the live FastAPI app is static for the
# duration of a test session, so recomputing the set per example would only
# add overhead.
_LIVE_V1_ROUTES: set[tuple[str, str]] = _live_v1_routes()
_REFERENCE_SET: set[tuple[str, str]] = set(REFERENCE_ROUTE_MANIFEST)


# Feature: backend-frontend-restructure, Property 2
@given(entry=st.sampled_from(REFERENCE_ROUTE_MANIFEST))
@settings(max_examples=100)
def test_reference_route_is_registered_on_live_app(entry: tuple[str, str]) -> None:
    """Every reference (method, path) is registered on the live FastAPI app."""
    method, path = entry
    assert (method, path) in _LIVE_V1_ROUTES, (
        f"Expected reference route {method} {path!r} to be registered on the "
        f"live FastAPI app under /api/v1/*, but it is missing. "
        f"Live /api/v1 routes: {sorted(_LIVE_V1_ROUTES)!r}"
    )


# Feature: backend-frontend-restructure, Property 2
def test_live_v1_routes_are_in_reference_manifest() -> None:
    """Every live (method, path) under /api/v1/* appears in REFERENCE_ROUTE_MANIFEST."""
    unexpected = _LIVE_V1_ROUTES - _REFERENCE_SET
    assert not unexpected, (
        f"Found {len(unexpected)} live /api/v1 route(s) not in the reference "
        f"manifest: {sorted(unexpected)!r}. Reference manifest: "
        f"{sorted(_REFERENCE_SET)!r}"
    )
