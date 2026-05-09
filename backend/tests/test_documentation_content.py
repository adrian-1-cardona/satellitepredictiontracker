"""Documentation content assertion tests.

Feature: backend-frontend-restructure, Task 7.5
Validates Requirements 5.1-5.5, 6.1-6.7, 7.1-7.6, 9.2, 9.3.

These tests read the real files produced by the restructure and assert
substring / structural properties on their content so regressions in the
setup documentation, the verification pathway, or the placeholder frontend
fail fast.
"""

from pathlib import Path

import yaml

# Workspace root: backend/tests/<this file>.py -> backend/tests -> backend -> workspace root
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


# ---------------------------------------------------------------------------
# Requirement 5.1-5.4: frontend/index.html is a valid HTML5 Hello World page
# ---------------------------------------------------------------------------


def test_frontend_index_html_content() -> None:
    index_path = WORKSPACE_ROOT / "frontend" / "index.html"
    assert index_path.exists(), f"Expected {index_path} to exist"

    content = _read(index_path)

    required_substrings = [
        "<!DOCTYPE html>",
        "<html",
        "<head",
        "<body",
        "Hello World",
    ]
    for needle in required_substrings:
        assert needle in content, (
            f"frontend/index.html is missing required substring {needle!r}. "
            f"Got content: {content!r}"
        )


# ---------------------------------------------------------------------------
# Requirement 5.5: the frontend is NOT wired into the Compose stack.
# ---------------------------------------------------------------------------


def test_frontend_not_in_compose() -> None:
    compose_path = WORKSPACE_ROOT / "backend" / "docker-compose.yml"
    assert compose_path.exists(), f"Expected {compose_path} to exist"

    compose = yaml.safe_load(_read(compose_path))
    services = compose.get("services", {})
    assert isinstance(services, dict) and services, (
        "backend/docker-compose.yml must define a non-empty 'services' mapping"
    )

    forbidden = ("frontend/", "../frontend")

    for service_name, service in services.items():
        # build.context check (build may be absent, a string, or a mapping)
        build = service.get("build")
        if isinstance(build, dict):
            context = build.get("context")
            if isinstance(context, str):
                for needle in forbidden:
                    assert needle not in context, (
                        f"Service {service_name!r} build.context "
                        f"{context!r} must not reference {needle!r}"
                    )
        elif isinstance(build, str):
            for needle in forbidden:
                assert needle not in build, (
                    f"Service {service_name!r} build shorthand "
                    f"{build!r} must not reference {needle!r}"
                )

        # volumes check - each entry may be a string "src:dst[:mode]" or a
        # long-form mapping {type, source, target, ...}.
        volumes = service.get("volumes") or []
        assert isinstance(volumes, list), (
            f"Service {service_name!r} volumes must be a list"
        )
        for entry in volumes:
            if isinstance(entry, str):
                for needle in forbidden:
                    assert needle not in entry, (
                        f"Service {service_name!r} volume entry "
                        f"{entry!r} must not reference {needle!r}"
                    )
            elif isinstance(entry, dict):
                source = entry.get("source", "")
                target = entry.get("target", "")
                for field_name, field_value in (
                    ("source", source),
                    ("target", target),
                ):
                    if not isinstance(field_value, str):
                        continue
                    for needle in forbidden:
                        assert needle not in field_value, (
                            f"Service {service_name!r} volume "
                            f"{field_name} {field_value!r} must not "
                            f"reference {needle!r}"
                        )


# ---------------------------------------------------------------------------
# Requirement 6.1-6.7, 9.2, 9.3: backend/BACKEND_SETUP.md content checks.
# ---------------------------------------------------------------------------


def test_backend_setup_content() -> None:
    setup_path = WORKSPACE_ROOT / "backend" / "BACKEND_SETUP.md"
    assert setup_path.exists(), f"Expected {setup_path} to exist"

    content = _read(setup_path)

    required_substrings = [
        # Docker quickstart (Req 6.2, 9.3)
        "docker compose --env-file ../.env up --build",
        # Local setup (Req 6.3)
        "pip install -r requirements.txt",
        "alembic upgrade head",
        # Local process commands (Req 6.4)
        "uvicorn app.main:app",
        "celery -A app.tasks:celery_app worker",
        "celery -A app.tasks:celery_app beat",
        # Fixed host ports (Req 6.5)
        "8000",
        "5432",
        "6379",
        "5050",
        # Health / metrics URLs (Req 6.7)
        "http://localhost:8000/health",
        "http://localhost:8000/ready",
        "http://localhost:8000/metrics",
    ]
    for needle in required_substrings:
        assert needle in content, (
            f"backend/BACKEND_SETUP.md is missing required substring "
            f"{needle!r}"
        )

    # Req 6.6: mention that /docs and /redoc are disabled (case-insensitive).
    lowered = content.lower()
    assert "/docs" in lowered, (
        "backend/BACKEND_SETUP.md must mention the /docs endpoint in the "
        "disabled-docs discussion"
    )
    assert "/redoc" in lowered, (
        "backend/BACKEND_SETUP.md must mention the /redoc endpoint in the "
        "disabled-docs discussion"
    )
    assert ("disable" in lowered) or ("404" in lowered), (
        "backend/BACKEND_SETUP.md must explain that /docs and /redoc are "
        "disabled or return 404"
    )


# ---------------------------------------------------------------------------
# Requirement 7.1-7.5: docs/README.md Verification Pathway content.
# ---------------------------------------------------------------------------


def test_docs_readme_verification_pathway() -> None:
    docs_readme = WORKSPACE_ROOT / "docs" / "README.md"
    assert docs_readme.exists(), f"Expected {docs_readme} to exist"

    content = _read(docs_readme)

    # Req 7.1: Verification Pathway heading/section.
    assert "Verification Pathway" in content, (
        "docs/README.md must contain a 'Verification Pathway' section heading"
    )

    # Req 7.2: compose command from backend/.
    assert "docker compose --env-file ../.env up --build" in content, (
        "docs/README.md Verification Pathway must include the compose "
        "command 'docker compose --env-file ../.env up --build'"
    )

    # Req 7.3: health, readiness, metrics URLs.
    for url in (
        "http://localhost:8000/health",
        "http://localhost:8000/ready",
        "http://localhost:8000/metrics",
    ):
        assert url in content, (
            f"docs/README.md Verification Pathway must reference {url}"
        )

    # Req 7.4: curl example against /health.
    assert "curl http://localhost:8000/health" in content, (
        "docs/README.md Verification Pathway must include a "
        "'curl http://localhost:8000/health' example"
    )

    # Req 7.5: 404 note covering /docs, /redoc, /openapi.json (case-insensitive).
    lowered = content.lower()
    assert "404" in lowered, (
        "docs/README.md Verification Pathway must mention the 404 response "
        "for the disabled doc endpoints"
    )
    for doc_path in ("/docs", "/redoc", "/openapi.json"):
        assert doc_path in lowered, (
            f"docs/README.md Verification Pathway must reference {doc_path} "
            f"when describing the 404 behaviour"
        )


# ---------------------------------------------------------------------------
# Requirement 7.6: root README links to backend, docs, and frontend entry points.
# ---------------------------------------------------------------------------


def test_root_readme_links() -> None:
    root_readme = WORKSPACE_ROOT / "README.md"
    assert root_readme.exists(), f"Expected {root_readme} to exist"

    content = _read(root_readme)

    required_paths = [
        "backend/BACKEND_SETUP.md",
        "docs/README.md",
        "frontend/index.html",
    ]
    for needle in required_paths:
        assert needle in content, (
            f"Root README.md must link to or reference {needle!r}"
        )
