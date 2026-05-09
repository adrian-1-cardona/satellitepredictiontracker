# Implementation Plan: Backend/Frontend Restructure

Convert the feature design into a series of prompts for a code-generation LLM that will implement each step with incremental progress. Make sure that each prompt builds on the previous prompts, and ends with wiring things together. There should be no hanging or orphaned code that isn't integrated into a previous step. Focus ONLY on tasks that involve writing, modifying, or testing code.

## Overview

This plan implements the restructure in a strict order designed to never leave the repository in a broken intermediate state:

1. Create workspace-root scaffolding (new files that do not depend on the move) and append the Verification Pathway.
2. Perform the atomic move of all `Backend_Code` into `backend/` (`git mv`).
3. Apply the in-place edits required by the move (`docker-compose.yml` volumes/env_file, `main.py` OpenAPI disabling).
4. Author `backend/BACKEND_SETUP.md` and add the test dependencies plus the shared test manifest module.
5. Add the five property-based tests and the supporting example/smoke tests that validate the restructure invariants.

Implementation language: **Python 3.11** (matches the existing backend).

## Tasks

- [x] 1. Create workspace-root scaffolding that does not depend on the backend move
  - [x] 1.1 Create `frontend/index.html` with the Hello World placeholder
    - Write a valid HTML5 document with `<!DOCTYPE html>`, `<html lang="en">`, `<head>` (charset + title), and `<body>` containing `<h1>Hello World</h1>`
    - Do not add any build tooling, `package.json`, or bundler configuration
    - File location: `/Users/adriancardina/Desktop/satellitepredictiontracker/frontend/index.html`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 1.2 Create root `README.md` pointer
    - Short description of the new top-level layout (`backend/`, `frontend/`, `docs/`)
    - Links to `backend/BACKEND_SETUP.md`, `docs/README.md`, and `frontend/index.html`
    - Include a small tree-style diagram of the top-level directories
    - File location: `/Users/adriancardina/Desktop/satellitepredictiontracker/README.md`
    - _Requirements: 7.6_

  - [x] 1.3 Add `backend/.env` ignore rule to `.gitignore`
    - Append a line for `backend/.env` so a locally created symlink or copy is never committed
    - Do not remove or reorder any existing entries
    - _Requirements: 9.1_

  - [x] 1.4 Append the Verification Pathway section to `docs/README.md`
    - Add a new `## Verification Pathway` section at the end of the file
    - List `docker compose --env-file ../.env up --build` executed from `backend/`
    - List `GET /health`, `GET /ready`, `GET /metrics` URLs (full `http://localhost:8000/...` form)
    - Include at least one `curl http://localhost:8000/health` example with the expected JSON shape (`status`, `version`, `timestamp`)
    - Note that `GET /docs`, `GET /redoc`, and `GET /openapi.json` are expected to return HTTP 404 after the restructure
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2. Relocate backend artifacts into `backend/` and apply in-place edits
  - [x] 2.1 Perform the atomic `git mv` of all `Backend_Code` into `backend/`
    - `git mv app backend/app`
    - `git mv alembic backend/alembic`
    - `git mv tests backend/tests`
    - `git mv Dockerfile.api backend/Dockerfile.api`
    - `git mv docker-compose.yml backend/docker-compose.yml`
    - `git mv requirements.txt backend/requirements.txt`
    - `git mv pytest.ini backend/pytest.ini`
    - `git mv alembic.ini backend/alembic.ini`
    - Do not change file contents in this step (byte-for-byte preservation); all edits happen in 2.2 and 2.3
    - Verify `backend/alembic.ini`, `backend/pytest.ini`, and `backend/Dockerfile.api` still contain their relative paths unchanged (`script_location = alembic`, `prepend_sys_path = .`, `testpaths = tests`, `pythonpath = .`, `COPY requirements.txt .`, etc.) — no edits required because `backend/` becomes the new rootdir/build context
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.1, 8.2, 8.3, 8.4_

  - [x] 2.2 Update `backend/docker-compose.yml` volume mounts and env_file references
    - For services `api`, `celery_worker`, and `celery_beat`:
      - Change volume source `./data:/app/data` to `../data:/app/data`
      - Add `env_file: [- ../.env]` to each service
    - Leave `build.context: .` and `dockerfile: Dockerfile.api` unchanged (the compose file now lives in `backend/`, so `.` correctly resolves to the `backend/` build context)
    - Leave `ports`, `depends_on`, `healthcheck`, service names, and `environment:` blocks unchanged
    - Leave `postgres`, `redis`, and `pgadmin` service definitions untouched
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 8.5, 9.3, 9.4_

  - [x] 2.3 Disable the public OpenAPI surface in `backend/app/main.py`
    - Modify only the `FastAPI(...)` constructor call; do not touch any middleware, handler, router include, or startup hook
    - Add `docs_url=None`, `redoc_url=None`, `openapi_url=None` as keyword arguments
    - Add an inline comment on the same block explaining that these endpoints are disabled to avoid exposing the API surface to unauthenticated visitors (the comment must be discoverable by a simple substring/regex search on the file)
    - Do not modify `/health`, `/ready`, `/metrics`, or any `app.include_router(...)` call
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. Author backend setup documentation
  - [x] 3.1 Create `backend/BACKEND_SETUP.md`
    - Overview paragraph describing what lives in `backend/`
    - Docker Compose quickstart: `cd backend && docker compose --env-file ../.env up --build`
    - Fixed host ports list: API `8000`, Postgres `5432`, Redis `6379`, PgAdmin `5050`
    - Health and metrics URLs section with `http://localhost:8000/health`, `http://localhost:8000/ready`, `http://localhost:8000/metrics`
    - "Disabled docs" note explaining `/docs`, `/redoc`, `/openapi.json` return 404 and directing readers to `curl` or the future frontend
    - Local Python setup section: create venv, `pip install -r requirements.txt`, `alembic upgrade head`
    - Local run commands for the three processes: `uvicorn app.main:app --reload`, `celery -A app.tasks:celery_app worker --loglevel=info`, `celery -A app.tasks:celery_app beat --loglevel=info`
    - Env file convention section explaining `.env` / `.env.example` stay at the workspace root and documenting `--env-file ../.env` (Docker) and the workspace-root CWD convention (local)
    - Data volume section explaining `../data:/app/data` mount and `TLE_CACHE_PATH`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 9.2, 9.3_

- [x] 4. Checkpoint - backend is relocated and documented
  - Ensure `docker compose -f backend/docker-compose.yml config` exits 0, `alembic upgrade head` runs from `backend/` against a disposable database, and `backend/BACKEND_SETUP.md` and the appended Verification Pathway render correctly. Ask the user if questions arise.

- [x] 5. Prepare the test harness for property and smoke tests
  - [x] 5.1 Add `hypothesis` and `PyYAML` as dev dependencies in `backend/requirements.txt`
    - Pin `hypothesis` and `PyYAML` to explicit version ranges compatible with Python 3.11 and the existing pinned stack (`pytest`, `pytest-asyncio`, `httpx`)
    - Do not alter any existing pin
    - _Requirements: 2.7, 10.1_

  - [x] 5.2 Create `backend/tests/restructure_manifests.py` with shared fixtures used by property tests
    - Export `FILE_MOVES`: list of `(src, dst)` tuples derived from the design's File Relocation Manifest (moves only)
    - Export `FILES_UNCHANGED_LOCATION`: list of workspace-root paths that must not be mirrored inside `backend/` (`docs/`, `data/`, `instructions/`, `.vscode/`, `.env`, `.env.example`, `.gitignore`)
    - Export `REFERENCE_ROUTE_MANIFEST`: list of `(method, path)` tuples covering every `/api/v1/*` endpoint captured in the design's `preservedEndpoints` table (auth, locations, passes, satellites, alerts, admin)
    - Export `DOC_PATH_VARIANTS`: `["/docs", "/docs/", "/redoc", "/redoc/", "/openapi.json", "/openapi.json/"]`
    - Export `HTTP_METHODS`: `["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]`
    - Export `COMPOSE_SERVICE_EXPECTATIONS`: dict describing the expected `env_file`, `../data` volume suffix, `depends_on` pairs with `condition: service_healthy`, `build.context`, and `build.dockerfile` for `api`, `celery_worker`, `celery_beat`, plus the port map `{"api": 8000, "postgres": 5432, "redis": 6379, "pgadmin": 5050}`
    - Export `backend_app_modules()`: helper using `pkgutil.walk_packages` that enumerates importable module names under `backend/app/`
    - _Requirements: 1.2, 1.3, 2.1, 3.1, 3.2, 4.1, 4.3, 4.4, 4.5_

- [x] 6. Property-based tests for restructure invariants
  - [x] 6.1 Write property test for move manifest consistency
    - **Property 1: Move Manifest Consistency**
    - **Validates: Requirements 1.2, 1.3**
    - Use Hypothesis `sampled_from(FILE_MOVES)` and `sampled_from(FILES_UNCHANGED_LOCATION)` from `restructure_manifests.py`
    - For every `(src, dst)` in `FILE_MOVES`: assert `dst` exists and matches the source kind (file vs directory) while `src` no longer exists at the workspace root
    - For every entry in `FILES_UNCHANGED_LOCATION`: assert it still exists at the workspace root and no identically-named shadow copy exists inside `backend/`
    - Configure `hypothesis.settings(max_examples=100)` and tag the test with `# Feature: backend-frontend-restructure, Property 1`
    - File: `backend/tests/test_restructure_layout.py`

  - [x] 6.2 Write property test for API route parity under `/api/v1`
    - **Property 2: API Route Parity Under /api/v1**
    - **Validates: Requirements 2.1, 3.7, 10.4**
    - Use `fastapi.testclient.TestClient` (or direct inspection of `app.routes`) and `sampled_from(REFERENCE_ROUTE_MANIFEST)`
    - Assert every `(method, path)` in the reference manifest is registered on the live app with that exact method and path
    - Assert every `(method, path)` registered on the live app under `/api/v1/*` appears in the reference manifest (bidirectional parity)
    - Configure `hypothesis.settings(max_examples=100)` and tag with `# Feature: backend-frontend-restructure, Property 2`
    - File: `backend/tests/test_restructure_routes.py`

  - [x] 6.3 Write property test for hidden documentation endpoints
    - **Property 3: Hidden Documentation Endpoints Return 404**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 10.5**
    - Use `TestClient` and `sampled_from(HTTP_METHODS) × sampled_from(DOC_PATH_VARIANTS)`
    - For every combination, assert the response status is `404` and the body does not contain Swagger UI or ReDoc HTML markers (`swagger-ui`, `redoc`, `<title>Swagger`, etc.)
    - Configure `hypothesis.settings(max_examples=100)` and tag with `# Feature: backend-frontend-restructure, Property 3`
    - File: `backend/tests/test_restructure_hidden_docs.py`

  - [x] 6.4 Write property test for compose service structural invariants
    - **Property 4: Compose Service Structural Invariants**
    - **Validates: Requirements 4.1, 4.3, 4.4, 4.5, 9.4**
    - Parse `backend/docker-compose.yml` with `PyYAML`
    - Use `sampled_from(["api", "celery_worker", "celery_beat"])` for per-service checks; assert:
      - `env_file` includes `../.env`
      - `volumes` contains a mount whose host side resolves to `../data` and whose container side begins with `/app/data`
      - `depends_on` includes `postgres` and `redis` each with `condition: service_healthy`
      - `build.context` is `.` and `build.dockerfile` is `Dockerfile.api`
    - Separate deterministic check for the port map `{"api": 8000, "postgres": 5432, "redis": 6379, "pgadmin": 5050}`
    - Configure `hypothesis.settings(max_examples=100)` and tag with `# Feature: backend-frontend-restructure, Property 4`
    - File: `backend/tests/test_restructure_compose.py`

  - [x] 6.5 Write property test for backend module import health
    - **Property 5: Backend Module Import Health**
    - **Validates: Requirements 2.1, 2.6, 2.7, 8.4**
    - Enumerate modules via `backend_app_modules()` using `pkgutil.walk_packages` rooted at `backend/app/`
    - For every module name, `importlib.import_module(name)` must succeed without raising `ImportError` or `ModuleNotFoundError`
    - Run the test with CWD = `backend/` and `backend/` on `sys.path` (handled through a pytest fixture)
    - Configure `hypothesis.settings(max_examples=100)` and tag with `# Feature: backend-frontend-restructure, Property 5`
    - File: `backend/tests/test_restructure_imports.py`

- [x] 7. Example and smoke tests
  - [x] 7.1 Write contract tests for `/health`, `/ready`, and `/metrics`
    - `TestClient.get("/health")` → assert status 200 and JSON body contains keys `status`, `version`, `timestamp`
    - `TestClient.get("/ready")` with a healthy SQLite/in-memory fixture → assert status 200 and JSON body has `ready: true`
    - `TestClient.get("/metrics")` → assert status 200 and `Content-Type` matches Prometheus `text/plain; version=...`
    - File: `backend/tests/test_health_ready_metrics_contract.py`
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

  - [x] 7.2 Write FastAPI constructor and main.py comment assertion test
    - Import `backend/app/main.py` and assert `app.docs_url is None`, `app.redoc_url is None`, `app.openapi_url is None`
    - Regex-grep the source of `backend/app/main.py` for `docs_url=None`, `redoc_url=None`, `openapi_url=None`, and for a comment on the same block mentioning "disable" or "avoid exposing" (or an equivalent rationale keyword)
    - File: `backend/tests/test_fastapi_constructor.py`
    - _Requirements: 3.1, 3.2, 3.6_

  - [x] 7.3 Write alembic migration smoke test
    - `subprocess.run(["alembic", "upgrade", "head"], cwd="backend", env={...SQLALCHEMY_URL pointing at a tempfile SQLite DB...})`
    - Assert exit code 0
    - Open the resulting DB and assert at least one expected table (e.g., `users`) exists
    - File: `backend/tests/test_alembic_migration_smoke.py`
    - _Requirements: 2.6, 10.3_

  - [x] 7.4 Write docker compose config validity smoke test
    - `subprocess.run(["docker", "compose", "-f", "backend/docker-compose.yml", "config"], cwd=workspace_root)`
    - Assert exit code 0 when `docker` is available; skip cleanly when not
    - File: `backend/tests/test_compose_config_smoke.py`
    - _Requirements: 4.1, 10.2_

  - [x] 7.5 Write documentation content assertion tests
    - Assert `frontend/index.html` contains `<!DOCTYPE html>`, `<html`, `<head`, `<body`, and `Hello World` (Req 5.1–5.4)
    - Parse `backend/docker-compose.yml` and assert no service references `frontend/` in `build` or `volumes` (Req 5.5)
    - Assert `backend/BACKEND_SETUP.md` contains substrings: `docker compose --env-file ../.env up --build`, `pip install -r requirements.txt`, `alembic upgrade head`, `uvicorn app.main:app`, `celery -A app.tasks:celery_app worker`, `celery -A app.tasks:celery_app beat`, `8000`, `5432`, `6379`, `5050`, `http://localhost:8000/health`, `http://localhost:8000/ready`, `http://localhost:8000/metrics`, and a mention that `/docs` and `/redoc` are disabled (Req 6.1–6.7, 9.2, 9.3)
    - Assert `docs/README.md` contains the heading `Verification Pathway`, the `docker compose --env-file ../.env up --build` command, the three health/metrics URLs, a `curl http://localhost:8000/health` example, and a note about the 404 behaviour for `/docs`, `/redoc`, and `/openapi.json` (Req 7.1–7.5)
    - Assert workspace-root `README.md` links to `backend/BACKEND_SETUP.md`, `docs/README.md`, and `frontend/index.html` (Req 7.6)
    - File: `backend/tests/test_documentation_content.py`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 9.2, 9.3_

  - [x] 7.6 Write filesystem assertion tests for env and shared asset locations
    - Assert `.env` and `.env.example` exist at the workspace root
    - Assert `data/`, `docs/`, `instructions/`, `.vscode/` exist at the workspace root and are not duplicated inside `backend/`
    - Assert `backend/.env` is listed in `.gitignore`
    - File: `backend/tests/test_restructure_env_and_shared.py`
    - _Requirements: 1.3, 9.1, 9.4_

- [x] 8. Final checkpoint - run the full test suite
  - Ensure all tests pass (`pytest` from `backend/`, `docker compose -f backend/docker-compose.yml config` exits 0, `alembic upgrade head` succeeds from `backend/` against a disposable database). Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP path.
- Each task references specific requirements for traceability.
- Checkpoints (tasks 4 and 8) validate incremental state without modifying code.
- Property tests (6.1–6.5) validate the five universal correctness properties from the design and import shared fixtures from `backend/tests/restructure_manifests.py`.
- Example/smoke tests (7.1–7.6) cover single-endpoint contracts, constructor attributes, migration success, compose config validity, documentation content substrings, and filesystem placement that are not naturally expressible as "for all X".
- The move in task 2.1 is deliberately atomic: `backend/alembic.ini`, `backend/pytest.ini`, and `backend/Dockerfile.api` require no content changes because `backend/` becomes the new rootdir / build context.
- `docker-compose.yml` edits (2.2) and `main.py` edits (2.3) happen immediately after the move and are the only in-place content changes to `Backend_Code` files.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.1", "5.1", "5.2"] },
    { "id": 3, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5", "7.1", "7.2", "7.3", "7.4", "7.5", "7.6"] }
  ]
}
```
