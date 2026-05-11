Production-Ready 12-Week Roadmap
Summary
Revise .instructions-production.md into a repo-specific production roadmap for the current Satellite Tracker app: FastAPI/PostgreSQL/Redis/Celery backend, React/Vite/Three.js frontend, full TypeScript + Tailwind migration, private API docs, and VPS Docker Compose deployment.

Starting baseline: backend tests are 28 passed / 5 failed; frontend tests are 46 passed / 4 failed. Week 1 starts by restoring a green test contract before adding CI/CD.

Key Changes
Weeks 1-2: Baseline + CI/CD

Fix stale restructure/docs/frontend tests, restore docs/README.md, remove root app/ cache shadow, add .hypothesis/ to .gitignore.
Add GitHub Actions for backend tests, frontend tests/build, Docker Compose config, coverage, and security/dependency checks.
Use GHCR as the image registry and build backend/frontend images on main.
Weeks 3-5: Frontend Modernization

Migrate frontend from JSX/CSS to TypeScript + Tailwind, ending with strict typecheck and no remaining JSX entrypoints.
Add TanStack Query for server state and keep Zustand only for local UI/session state.
Preserve current Three.js visual behavior while converting components.
Weeks 6-8: Backend Hardening + Observability

Add rate limiting, standardized handling for validation/HTTP/unhandled errors, production secret validation, security headers, and request/user-aware JSON logs.
Keep public /docs, /redoc, and /openapi.json disabled; add admin-protected private API docs/OpenAPI access.
Expand Prometheus metrics for request latency, DB pool/query health, Celery jobs, pass predictions, and alert triggers.
Add Prometheus, Grafana, Loki/Promtail, and dashboards to local/VPS Compose.
Weeks 9-10: Deployment + Data Resilience

Add root-level production Compose stack for frontend, API, Celery worker/beat, Postgres, Redis, Prometheus, Grafana, and logging.
Convert backend Dockerfile to multi-stage/non-root; add frontend production Dockerfile.
Move production DB lifecycle to Alembic migrations, configure SQLAlchemy pool sizing, and add daily pg_dump backup container with S3-compatible upload.
Weeks 11-12: Runbooks + Release Readiness

Add deployment, rollback, incident response, backup restore, and monitoring runbooks.
Add smoke/e2e checks for login, location creation, pass prediction, alerts, metrics, private docs, and 3D landing render.
Update README and .instructions-production.md so docs match the actual repo and chosen architecture.
Public APIs / Interfaces
Preserve existing /api/v1/*, /health, /ready, and /metrics.
Add authenticated admin-only API docs endpoints, keeping public docs disabled.
Add WebSocket endpoint for authenticated prediction/alert updates with JSON event payloads for job status and alert notifications.
Add production env vars for pool sizing, rate limits, logging, backup destination, and deployment mode.
Test Plan
Backend: pytest, coverage >=70%, migration smoke, auth/refresh/logout, rate limit behavior, standardized errors, metrics, private docs access.
Frontend: npm test, npm run build, typecheck, accessibility tests, TanStack Query contract tests, landing/3D regression tests.
CI/CD: all workflows green on PR, Docker images build, Compose config validates, security/dependency scans run.
Deployment: VPS smoke verifies health, readiness, login, prediction flow, metrics scrape, Grafana dashboard, and backup restore.
Assumptions
Deployment target is one small VPS using Docker Compose and GHCR images.
Frontend migration is full TypeScript + Tailwind, not incremental-only.
API docs remain private/admin-only in production.
Grafana/Loki are local-first in Compose; Grafana Cloud, Sentry, and PostHog stay optional later integrations.
