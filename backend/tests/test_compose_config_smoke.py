"""Smoke test: `docker compose config` exits 0 for backend/docker-compose.yml.

Feature: backend-frontend-restructure
Validates: Requirements 4.1, 10.2

This test confirms that `docker compose -f backend/docker-compose.yml config`
produces a valid merged configuration with no unresolved path errors when
executed from the workspace root. If the `docker` CLI is not available on
the host (or `docker compose` subcommand is unsupported, e.g., a legacy
standalone `docker-compose` install), the test skips cleanly so the wider
pytest suite keeps a green baseline on developer machines and CI runners
that do not ship Docker.
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import pytest

# backend/tests/<this file> -> backend/tests -> backend -> workspace root
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
COMPOSE_FILE_REL = "backend/docker-compose.yml"


def _docker_compose_subcommand_missing(stderr: str) -> bool:
    """Return True when stderr signals the `docker compose` subcommand is absent.

    Old Docker installations ship the classic standalone `docker-compose`
    binary without the Compose V2 plugin. Invoking `docker compose ...` on
    those hosts fails with a message like "docker: 'compose' is not a docker
    command" or "unknown command: compose". We treat that as an environment
    skip rather than a test failure, matching the behaviour for a fully
    missing docker CLI.
    """
    lowered = stderr.lower()
    return (
        "'compose' is not a docker command" in lowered
        or "is not a docker command" in lowered
        or "unknown command" in lowered and "compose" in lowered
    )


def test_docker_compose_config_is_valid() -> None:
    """`docker compose -f backend/docker-compose.yml config` exits 0."""
    if shutil.which("docker") is None:
        pytest.skip("docker CLI not available")

    # Confirm the compose file actually exists before shelling out so a typo
    # in the restructure surfaces as a useful assertion rather than an opaque
    # docker error.
    compose_path = WORKSPACE_ROOT / COMPOSE_FILE_REL
    assert compose_path.is_file(), (
        f"expected compose file at {compose_path} but it was not found"
    )

    result = subprocess.run(
        ["docker", "compose", "-f", COMPOSE_FILE_REL, "config"],
        cwd=WORKSPACE_ROOT,
        capture_output=True,
        text=True,
        timeout=60,
    )

    if result.returncode != 0 and _docker_compose_subcommand_missing(result.stderr):
        pytest.skip(
            "docker CLI present but `docker compose` subcommand is unavailable; "
            "install Compose V2 to run this smoke test"
        )

    assert result.returncode == 0, (
        "docker compose config failed with exit code "
        f"{result.returncode}. stderr:\n{result.stderr}"
    )
