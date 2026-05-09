# Requirements Document

## Introduction

The Satellite Tracker project currently keeps all backend source, configuration, and operational files (app/, alembic/, tests/, Dockerfile.api, docker-compose.yml, requirements.txt, pytest.ini, alembic.ini) directly at the workspace root. FastAPI is also publishing Swagger UI and ReDoc at /docs and /redoc, exposing the API surface publicly.

This feature restructures the repository so all backend code lives under a dedicated backend/ folder, adds a minimal frontend/ folder with a placeholder index.html, disables the public Swagger UI and ReDoc endpoints, and updates project documentation so the developer can verify a Docker-based run end to end. All existing backend functionality (API endpoints, migrations, Celery tasks, health checks, metrics, tests) must keep working without behavioral change.

## Glossary

- **Workspace_Root**: The repository directory at `/Users/adriancardina/Desktop/satellitepredictiontracker`.
- **Backend_Folder**: The new directory `backend/` at the Workspace_Root that contains all backend code.
- **Frontend_Folder**: The new directory `frontend/` at the Workspace_Root that contains the placeholder UI.
- **Backend_Code**: The set of files and directories `app/`, `alembic/`, `tests/`, `docker-compose.yml`, `Dockerfile.api`, `requirements.txt`, `pytest.ini`, `alembic.ini`.
- **Shared_Assets**: The directories `docs/`, `data/`, `instructions/`, and other root-level files that are not Backend_Code and not frontend assets.
- **FastAPI_App**: The FastAPI application instance defined in `backend/app/main.py` after the move.
- **Swagger_UI**: The interactive OpenAPI documentation page served by FastAPI at `/docs` by default.
- **ReDoc_UI**: The alternative OpenAPI documentation page served by FastAPI at `/redoc` by default.
- **OpenAPI_Schema**: The machine-readable OpenAPI JSON served by FastAPI at `/openapi.json` by default.
- **Health_Endpoints**: The routes `GET /health` and `GET /ready` served by FastAPI_App.
- **Metrics_Endpoint**: The route `GET /metrics` served by FastAPI_App that returns Prometheus metrics.
- **API_Endpoints**: All application routes mounted under `/api/v1` (auth, locations, passes, alerts, admin).
- **Compose_Stack**: The multi-service Docker Compose deployment defined in `backend/docker-compose.yml`.
- **Backend_Setup_Doc**: The new file `backend/BACKEND_SETUP.md`.
- **Project_Readme**: The existing top-level project README at `docs/README.md` (no README exists directly at the Workspace_Root today).
- **Root_Pointer_Readme**: A new minimal `README.md` placed at the Workspace_Root that describes the new top-level layout and links to Backend_Setup_Doc, Project_Readme, and Frontend_Folder.
- **Verification_Pathway**: A step-by-step sequence of commands and URLs that a developer runs after `docker compose up --build` to confirm the backend is healthy.
- **Private_Endpoints**: Endpoints the developer wants kept runnable but not publicly documented (Swagger_UI, ReDoc_UI, OpenAPI_Schema).

## Requirements

### Requirement 1: Backend Folder Reorganization

**User Story:** As the project owner, I want all backend code grouped under a single `backend/` folder, so that the repository structure clearly separates backend from frontend and shared assets.

#### Acceptance Criteria

1. THE Restructure SHALL create the Backend_Folder at the Workspace_Root.
2. THE Restructure SHALL move `app/`, `alembic/`, `tests/`, `docker-compose.yml`, `Dockerfile.api`, `requirements.txt`, `pytest.ini`, and `alembic.ini` from the Workspace_Root into the Backend_Folder.
3. THE Restructure SHALL leave `docs/`, `data/`, `instructions/`, `.vscode/`, `.git/`, `.gitignore`, `.env`, and `.env.example` at the Workspace_Root.
4. WHERE a moved file references another moved file by relative path, THE Restructure SHALL update that path so the reference resolves correctly from the Backend_Folder.
5. IF any Backend_Code file is not present at the Workspace_Root before the move, THEN THE Restructure SHALL skip that file and record the skip in the change notes.

### Requirement 2: Preservation of Backend Behavior

**User Story:** As the project owner, I want the backend to behave identically after the move, so that I do not regress any existing functionality.

#### Acceptance Criteria

1. THE FastAPI_App SHALL expose the same set of API_Endpoints that existed before the Restructure, with identical HTTP methods and paths under `/api/v1`.
2. THE FastAPI_App SHALL continue to serve `GET /health` with a JSON body containing the keys `status`, `version`, and `timestamp`.
3. THE FastAPI_App SHALL continue to serve `GET /ready` with a JSON body containing `ready: true` when the database query succeeds.
4. IF the `GET /ready` database check fails, THEN THE FastAPI_App SHALL keep the `/ready` route registered and respond with an HTTP status and body that surface the failure, rather than removing or deactivating the route.
5. THE FastAPI_App SHALL continue to serve `GET /metrics` with Prometheus text format content.
6. WHEN `alembic upgrade head` is executed from the Backend_Folder, THE Alembic configuration SHALL apply the existing `001_initial_schema` migration to the configured database.
7. WHEN `pytest` is executed from the Backend_Folder, THE test suite SHALL discover and run the tests in `backend/tests/` with the same pass/fail outcome as before the Restructure on an unchanged environment.

### Requirement 3: Disable Public API Documentation

**User Story:** As the project owner, I want Swagger UI and ReDoc hidden from public access, so that the API surface is not advertised to unauthenticated visitors.

#### Acceptance Criteria

1. THE FastAPI_App SHALL be constructed with `docs_url=None` and `redoc_url=None`.
2. THE FastAPI_App SHALL be constructed with `openapi_url=None` so the OpenAPI_Schema is not served publicly.
3. WHEN a client sends `GET /docs`, THE FastAPI_App SHALL respond with HTTP status 404.
4. WHEN a client sends `GET /redoc`, THE FastAPI_App SHALL respond with HTTP status 404.
5. WHEN a client sends `GET /openapi.json`, THE FastAPI_App SHALL respond with HTTP status 404.
6. THE FastAPI_App SHALL include an inline code comment next to the `docs_url`, `redoc_url`, and `openapi_url` arguments that explains the endpoints are disabled to avoid exposing the API surface.
7. THE Restructure SHALL leave the handler functions, route decorators, and response contracts for Health_Endpoints, Metrics_Endpoint, and API_Endpoints unmodified, even if shared middleware or FastAPI configuration also needs to be touched to disable Private_Endpoints.

### Requirement 4: Docker Compose Compatibility from Backend Folder

**User Story:** As the project owner, I want `docker compose up --build` to work when executed from the Backend_Folder, so that the Compose_Stack builds and runs after the move.

#### Acceptance Criteria

1. WHEN `docker compose up --build` is executed with `backend/docker-compose.yml` as the active compose file, THE Compose_Stack SHALL build the `api`, `celery_worker`, and `celery_beat` services from `backend/Dockerfile.api` using a build context that resolves `requirements.txt`, `app/`, and `alembic/` correctly.
2. IF any of the `api`, `celery_worker`, or `celery_beat` services cannot resolve its build context from `backend/`, THEN THE Compose_Stack SHALL fail the entire `docker compose up --build` invocation with a non-zero exit code rather than starting any service partially.
3. THE Compose_Stack SHALL mount a host directory for TLE cache so the path referenced by `TLE_CACHE_PATH` is writable inside the `api`, `celery_worker`, and `celery_beat` containers.
4. THE Compose_Stack SHALL keep the published host ports `8000` for the API service, `5432` for Postgres, `6379` for Redis, and `5050` for PgAdmin.
5. THE Compose_Stack SHALL retain the existing service dependency conditions so `api`, `celery_worker`, and `celery_beat` wait for `postgres` and `redis` to report healthy before starting.
6. IF the pre-move compose file references a path that no longer resolves from the Backend_Folder, THEN THE Restructure SHALL update that path so the reference resolves from `backend/`.
7. WHERE a path reference inside `backend/docker-compose.yml` already resolves correctly from the Backend_Folder after the move, THE Restructure SHALL leave that reference unchanged.

### Requirement 5: Frontend Placeholder

**User Story:** As the project owner, I want a minimal `frontend/` folder with a Hello World page, so that the repository reserves space for a future frontend.

#### Acceptance Criteria

1. THE Restructure SHALL create the Frontend_Folder at the Workspace_Root.
2. THE Frontend_Folder SHALL contain a file named `index.html`.
3. THE `frontend/index.html` file SHALL render the visible text `Hello World` when opened in a standards-compliant web browser.
4. THE `frontend/index.html` file SHALL be a valid HTML5 document with `<!DOCTYPE html>`, `<html>`, `<head>`, and `<body>` elements.
5. THE Restructure SHALL NOT wire the Frontend_Folder into the Compose_Stack in this feature.

### Requirement 6: Backend Setup Documentation

**User Story:** As the project owner, I want a clear Backend_Setup_Doc inside the Backend_Folder, so that I can run the backend with Docker or locally without guessing paths.

#### Acceptance Criteria

1. THE Restructure SHALL create Backend_Setup_Doc at `backend/BACKEND_SETUP.md`.
2. THE Backend_Setup_Doc SHALL include a Docker Compose quickstart section with the command `docker compose up --build` executed from the Backend_Folder.
3. THE Backend_Setup_Doc SHALL include a local Python setup section with steps for creating a virtual environment, running `pip install -r requirements.txt`, and running `alembic upgrade head`.
4. THE Backend_Setup_Doc SHALL include commands to start the three local processes: the Uvicorn API server, the Celery worker, and the Celery beat scheduler.
5. THE Backend_Setup_Doc SHALL list the host ports exposed by the Compose_Stack as `8000` for the API, `5432` for Postgres, `6379` for Redis, and `5050` for PgAdmin, using these fixed values regardless of any environment-specific overrides.
6. THE Backend_Setup_Doc SHALL state that Swagger_UI and ReDoc_UI are intentionally disabled and direct the reader to use `curl` or the future frontend to exercise the API.
7. THE Backend_Setup_Doc SHALL list the Health_Endpoints and the Metrics_Endpoint with their full URLs when running the Compose_Stack locally.

### Requirement 7: Top-Level README Verification Pathway

**User Story:** As the project owner, I want the project README to end with a verification pathway, so that after `docker compose up` I can confirm every service is up without reading the whole doc.

#### Acceptance Criteria

1. THE Restructure SHALL append a Verification_Pathway section at the bottom of Project_Readme.
2. THE Verification_Pathway SHALL list the command used to start the Compose_Stack from the Backend_Folder.
3. THE Verification_Pathway SHALL list the Health_Endpoints and the Metrics_Endpoint URLs that the developer should open or curl.
4. THE Verification_Pathway SHALL include at least one example `curl` invocation against `http://localhost:8000/health` with the expected JSON shape.
5. THE Verification_Pathway SHALL note that `http://localhost:8000/docs` and `http://localhost:8000/redoc` are expected to return HTTP 404 after the Restructure.
6. THE Restructure SHALL create Root_Pointer_Readme at `README.md` in the Workspace_Root that briefly describes the new `backend/`, `frontend/`, `docs/` layout and links to Backend_Setup_Doc and Project_Readme.

### Requirement 8: Relative Path Correctness

**User Story:** As the project owner, I want all configuration files to keep working after the move, so that I do not hit broken imports or missing files on first run.

#### Acceptance Criteria

1. THE Restructure SHALL update `backend/alembic.ini` so `script_location` and `prepend_sys_path` resolve to the Alembic directory from the Backend_Folder.
2. THE Restructure SHALL update `backend/Dockerfile.api` so `COPY` instructions reference paths that exist in the new Docker build context rooted at the Backend_Folder.
3. THE Restructure SHALL update `backend/pytest.ini` so `testpaths` and `pythonpath` resolve correctly when `pytest` is invoked from the Backend_Folder.
4. THE Restructure SHALL preserve every import statement in moved Python files such that `from app...` and `import app...` continue to resolve at runtime.
5. IF any path-bearing configuration file inside the Backend_Folder still references a pre-move absolute or relative path that no longer resolves, THEN THE Restructure SHALL correct that reference before the feature is considered complete.

### Requirement 9: Environment and Shared File Handling

**User Story:** As the project owner, I want `.env` and shared assets to keep working without manual relocation, so that the Compose_Stack and local processes can still read configuration.

#### Acceptance Criteria

1. THE Restructure SHALL keep `.env` and `.env.example` at the Workspace_Root.
2. THE Backend_Setup_Doc SHALL describe the final location of `.env` and `.env.example` and the exact steps required for the Compose_Stack and local processes to read them, whether those files stay at the Workspace_Root or are placed inside the Backend_Folder.
3. WHERE the Compose_Stack or local commands require environment values from `.env`, THE Backend_Setup_Doc SHALL show the exact `--env-file` flag or working-directory convention needed to load them from the chosen location.
4. THE Restructure SHALL keep the `data/` directory at the Workspace_Root and mount it into the Compose_Stack services that need `TLE_CACHE_PATH`.

### Requirement 10: Post-Restructure Verification

**User Story:** As the project owner, I want objective checks that prove the restructure worked, so that I can trust the change before committing it.

#### Acceptance Criteria

1. WHEN `pytest` is executed from the Backend_Folder on an unchanged environment, THE test suite SHALL exit with status code 0.
2. WHEN `docker compose config` is executed against `backend/docker-compose.yml`, THE Compose_Stack SHALL produce a valid merged configuration with no unresolved path errors.
3. WHEN `alembic upgrade head` is executed from the Backend_Folder against a fresh database, THE migration SHALL complete without error and produce the same schema as before the Restructure.
4. WHEN the FastAPI_App is started, THE endpoints `GET /health`, `GET /ready`, `GET /metrics`, and every route under `/api/v1/*` SHALL respond with the same HTTP status code they returned before the Restructure for equivalent inputs, treating the pre-move status as the reference regardless of whether it matches a standard HTTP code.
5. WHEN the FastAPI_App is started, THE endpoints `GET /docs`, `GET /redoc`, and `GET /openapi.json` SHALL respond with HTTP status 404.
