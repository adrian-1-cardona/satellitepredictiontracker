"""Shared fixtures for the restructure property tests.

This module intentionally avoids importing anything from ``app`` so that the
property tests can import it even before the backend package is fully wired
(or from a subprocess working directory where ``app`` is not yet importable).

It encodes the File Relocation Manifest, the preserved-endpoint manifest,
and the Compose service expectations captured in ``design.md`` so the
property tests in :mod:`backend.tests.test_restructure_*` have a single
source of truth.

Feature: backend-frontend-restructure
Requirements: 1.2, 1.3, 2.1, 3.1, 3.2, 4.1, 4.3, 4.4, 4.5
"""

from __future__ import annotations

import pkgutil
from pathlib import Path
from typing import List, Tuple

# ---------------------------------------------------------------------------
# File Relocation Manifest (moves only)
#
# Each tuple is ``(src, dst)`` where ``src`` is the workspace-relative path
# before the restructure and ``dst`` is the workspace-relative path after the
# restructure. Only pure "move" entries from the design manifest are listed
# here; create/modify/append entries are validated by example tests instead.
# ---------------------------------------------------------------------------
FILE_MOVES: List[Tuple[str, str]] = [
    ("app", "backend/app"),
    ("alembic", "backend/alembic"),
    ("tests", "backend/tests"),
    ("requirements.txt", "backend/requirements.txt"),
    ("pytest.ini", "backend/pytest.ini"),
    ("alembic.ini", "backend/alembic.ini"),
    ("Dockerfile.api", "backend/Dockerfile.api"),
    ("docker-compose.yml", "backend/docker-compose.yml"),
]

# ---------------------------------------------------------------------------
# Paths that must remain at the workspace root and must NOT be mirrored inside
# ``backend/`` (no identically-named shadow copy under ``backend/``).
# ---------------------------------------------------------------------------
FILES_UNCHANGED_LOCATION: List[str] = [
    "docs",
    "data",
    "instructions",
    ".vscode",
    ".env",
    ".env.example",
    ".gitignore",
]

# ---------------------------------------------------------------------------
# Reference route manifest for ``/api/v1/*`` endpoints.
#
# Mirrors ``preservedEndpoints`` from ``design.md`` (auth, locations, passes,
# satellites, alerts, admin). The health/ready/metrics endpoints live outside
# ``/api/v1`` and are covered by dedicated contract tests, so they are not
# included here.
# ---------------------------------------------------------------------------
REFERENCE_ROUTE_MANIFEST: List[Tuple[str, str]] = [
    # /api/v1/auth/*
    ("POST", "/api/v1/auth/register"),
    ("POST", "/api/v1/auth/login"),
    ("POST", "/api/v1/auth/refresh"),
    ("POST", "/api/v1/auth/logout"),
    ("GET", "/api/v1/auth/me"),
    # /api/v1/locations/*
    ("GET", "/api/v1/locations"),
    ("POST", "/api/v1/locations"),
    ("GET", "/api/v1/locations/{location_id}"),
    ("PATCH", "/api/v1/locations/{location_id}"),
    ("DELETE", "/api/v1/locations/{location_id}"),
    # /api/v1/passes/*
    ("GET", "/api/v1/passes"),
    ("POST", "/api/v1/passes/refresh"),
    ("GET", "/api/v1/passes/stats"),
    ("GET", "/api/v1/passes/{pass_id}"),
    # /api/v1/satellites
    ("GET", "/api/v1/satellites"),
    # /api/v1/alerts/*
    ("GET", "/api/v1/alerts"),
    ("POST", "/api/v1/alerts"),
    ("GET", "/api/v1/alerts/history"),
    ("GET", "/api/v1/alerts/history/recent"),  # legacy alias (include_in_schema=False)
    ("GET", "/api/v1/alerts/stats"),
    ("GET", "/api/v1/alerts/stats/summary"),  # legacy alias (include_in_schema=False)
    ("GET", "/api/v1/alerts/{alert_id}"),
    ("PATCH", "/api/v1/alerts/{alert_id}"),
    ("DELETE", "/api/v1/alerts/{alert_id}"),
    # /api/v1/admin/*
    ("GET", "/api/v1/admin/stats"),
    ("GET", "/api/v1/admin/job-status"),
    ("GET", "/api/v1/admin/job-status/{task_id}"),
    ("GET", "/api/v1/admin/users"),
    ("PATCH", "/api/v1/admin/users/{user_id}/active"),
    ("POST", "/api/v1/admin/cleanup"),
]

# ---------------------------------------------------------------------------
# Path variants that must return 404 after the restructure. Trailing-slash
# variants are included because FastAPI treats ``/docs`` and ``/docs/`` as
# separate routes; both must be absent.
# ---------------------------------------------------------------------------
DOC_PATH_VARIANTS: List[str] = [
    "/docs",
    "/docs/",
    "/redoc",
    "/redoc/",
    "/openapi.json",
    "/openapi.json/",
]

# HTTP methods crossed with DOC_PATH_VARIANTS in Property 3.
HTTP_METHODS: List[str] = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "HEAD",
    "OPTIONS",
]

# ---------------------------------------------------------------------------
# Structural expectations for ``backend/docker-compose.yml``.
#
# - ``services``                : services that must declare an ``env_file``,
#                                 a ``../data`` volume, and the two health
#                                 dependencies below.
# - ``env_file``                : exact string that must appear in each
#                                 service's ``env_file`` list.
# - ``volume_host_suffix``      : host side of the ``../data:/app/data`` mount
#                                 expressed as a POSIX suffix the test will
#                                 compare against.
# - ``volume_container_prefix`` : container side of the TLE cache mount.
# - ``depends_on``              : mapping from dependency service name to the
#                                 required ``condition`` value.
# - ``build_context``           : value required for ``build.context`` on the
#                                 api/celery services.
# - ``build_dockerfile``        : value required for ``build.dockerfile``.
# - ``ports``                   : fixed host port map for the four externally
#                                 reachable services.
# ---------------------------------------------------------------------------
COMPOSE_SERVICE_EXPECTATIONS = {
    "services": ["api", "celery_worker", "celery_beat"],
    "env_file": "../.env",
    "volume_host_suffix": "../data",
    "volume_container_prefix": "/app/data",
    "depends_on": {
        "postgres": "service_healthy",
        "redis": "service_healthy",
    },
    "build_context": ".",
    "build_dockerfile": "Dockerfile.api",
    "ports": {
        "api": 8000,
        "postgres": 5432,
        "redis": 6379,
        "pgadmin": 5050,
    },
}


def backend_app_modules() -> List[str]:
    """Enumerate importable module names under ``backend/app/``.

    This walks the ``backend/app`` directory tree with :func:`pkgutil.walk_packages`
    using ``"app."`` as the prefix so the returned names match what
    ``importlib.import_module`` expects when ``backend/`` is on ``sys.path``.

    The returned list always includes the top-level ``"app"`` package as the
    first element so callers can validate that the package itself imports
    cleanly, in addition to every submodule and subpackage below it.

    The walk is rooted at ``<workspace_root>/backend/app``. This module lives
    in ``backend/tests/``, so the workspace root is the parent of this file's
    grandparent; ``backend/app`` is therefore ``<grandparent>/app``.
    """
    # Path to this file's directory (backend/tests/), then up one to backend/,
    # then into app/. Using ``resolve()`` so symlinked checkouts still work.
    here = Path(__file__).resolve().parent  # backend/tests
    backend_dir = here.parent  # backend
    app_dir = backend_dir / "app"

    modules: List[str] = ["app"]
    if not app_dir.is_dir():
        # If the move has not happened yet (or the checkout is partial) return
        # just the top-level name; Property 5's import test will surface the
        # actual failure with a clearer message than an empty list would.
        return modules

    for module_info in pkgutil.walk_packages([str(app_dir)], prefix="app."):
        modules.append(module_info.name)

    return modules


__all__ = [
    "FILE_MOVES",
    "FILES_UNCHANGED_LOCATION",
    "REFERENCE_ROUTE_MANIFEST",
    "DOC_PATH_VARIANTS",
    "HTTP_METHODS",
    "COMPOSE_SERVICE_EXPECTATIONS",
    "backend_app_modules",
]
