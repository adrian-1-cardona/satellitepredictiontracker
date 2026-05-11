# Satellite Tracker

A full-stack satellite pass prediction platform built using the **Phased Delivery & Hardening (PDH) Framework** — a systematic 4-phase approach that demonstrates production-grade software engineering.

## 🛰️ Features

- **Real-time Satellite Predictions** - Predict when 1000+ satellites will pass your location (including ISS, Hubble, and more)
- **Multi-Location Support** - Track predictions for multiple saved locations
- **Smart Alerts** - Get notified before satellites pass overhead
- **3D Visualization** - Interactive 3D globe showing satellite positions and trajectories
- **User Authentication** - Secure JWT-based authentication with refresh tokens
- **Production Observability** - Prometheus/Grafana monitoring, structured logging (Loki)
- **Comprehensive Testing** - 33+ backend tests, 46+ frontend tests, E2E tests with Playwright
- **CI/CD Pipeline** - Automated testing, security scanning, and deployments via GitHub Actions

## 🚀 Quick Start

### Prerequisites
- **Node.js 22+** (for frontend development)
- **Docker & Docker Compose** (for backend and database)
- **Python 3.11+** (for backend development, optional)

### One-Command Startup

```bash
# 1. Clone and setup
git clone https://github.com/adrian-1-cardona/satellitepredictiontracker.git
cd satellitepredictiontracker
cp .env.example .env

# 2. Start entire stack (backend + frontend + all services)
cd backend
docker compose --env-file ../.env up --build

# 3. In a new terminal, start frontend dev server
cd frontend
npm install
npm run dev

# 4. Open in browser
# Frontend: http://localhost:3000
# API: http://localhost:8000/health
# API Docs: http://localhost:8000/docs
# Grafana: http://localhost:3001 (admin/admin)
# PgAdmin: http://localhost:5050 (admin@tracker.local/admin)
```

**⏱️ Wait:** The first startup takes 2-3 minutes. You'll see logs like:
```
api_1       | INFO:     Uvicorn running on http://0.0.0.0:8000
prometheus_1 | ts=... msg="Server is ready to receive web requests."
```
Once both appear, the system is ready!

## 🏗️ Architecture: The PDH Framework

This project was built systematically using 4 phases:

### Phase 1: Baseline & Velocity (Testing Infrastructure)
✅ Set up testing infrastructure (33 backend + 46 frontend tests)
✅ Configure CI/CD (GitHub Actions workflows)
✅ Establish code quality standards (linting, type checking)
✅ **Outcome:** Zero broken tests, 85%+ code coverage

### Phase 2: Feature Completeness (TypeScript Migration & UI)
✅ Convert frontend to TypeScript (35+ .tsx files)
✅ Implement 3D satellite visualization (Three.js + Cesium)
✅ Build complete user workflows (auth → locations → predictions → alerts)
✅ **Outcome:** Fully functional end-to-end system

### Phase 3: Hardening & Observability (Production-Ready)
✅ Add comprehensive monitoring (Prometheus + Grafana)
✅ Implement security hardening (OWASP Top 10 compliance)
✅ Add structured logging (Loki + Promtail)
✅ **Outcome:** Production-grade reliability and visibility

### Phase 4: Deployment & Scale (Multi-Stage Build & Runbooks)
✅ Multi-stage Docker builds (optimized images)
✅ Health check configuration
✅ Deployment runbooks
✅ **Outcome:** Ready for production deployment

## 💻 Technology Stack

### Backend
- **Framework:** FastAPI (modern, async-first Python web framework)
- **Database:** PostgreSQL (relational, ACID transactions)
- **Cache:** Redis (for job queue and caching)
- **Background Jobs:** Celery (distributed task processing)
- **Migrations:** Alembic (SQL version control)
- **API Documentation:** Auto-generated OpenAPI/Swagger

### Frontend
- **Framework:** React 19 with TypeScript
- **Styling:** Tailwind CSS
- **Build:** Vite (lightning-fast rebuilds)
- **Testing:** Vitest + Playwright E2E tests
- **3D Visualization:** Three.js + Cesium for globe rendering

### DevOps & Observability
- **Containerization:** Docker + Docker Compose
- **Metrics:** Prometheus (time-series metrics database)
- **Visualization:** Grafana (dashboards and alerts)
- **Logging:** Loki + Promtail (log aggregation)
- **CI/CD:** GitHub Actions (5 automated workflows)

### Why These Choices?
See [docs/adr/](docs/adr/) for **Architecture Decision Records** explaining each major technology choice.

## 📊 Performance Characteristics

| Operation | Latency | Throughput | Notes |
|-----------|---------|-----------|-------|
| GET /health | 2.5ms | - | Liveness check |
| GET /locations | 14ms | - | User's saved locations |
| POST /passes/predict | 245ms | - | Satellite prediction (Skyfield computation) |
| Concurrent users | p95: 289ms | 412 req/sec | 100 concurrent users, zero errors |
| Full stack startup | ~2 min | - | All services + database ready |

📈 See [docs/PERFORMANCE.md](docs/PERFORMANCE.md) for full benchmark results and scaling characteristics.

## 🔐 Security

**OWASP Top 10 (2021) Compliance:** ✅ All 10 categories addressed

- ✅ **A01 - Access Control:** Role-based access, user data scoping
- ✅ **A02 - Cryptography:** Bcrypt password hashing + HS256 JWT tokens
- ✅ **A03 - Injection:** SQLAlchemy ORM prevents SQL injection
- ✅ **A04 - Design:** Rate limiting, input validation, CORS scoping
- ✅ **A05 - Misconfiguration:** Debug disabled, security headers set
- ✅ **A06 - Vulnerable Components:** Dependency scanning (Bandit + npm audit)
- ✅ **A07 - Authentication:** Strong password requirements + token management
- ✅ **A08 - Integrity:** Code review gates, dependency pinning
- ✅ **A09 - Logging:** Structured logging of all security events
- ✅ **A10 - SSRF:** No user-controlled URL fetching

📖 See [docs/SECURITY.md](docs/SECURITY.md) for detailed security implementation and testing.

## 🧪 Testing

### Backend Tests
```bash
cd backend

# Run all tests
python -m pytest -v

# Run with coverage
python -m pytest --cov=app --cov-report=html

# Run specific test categories
python -m pytest tests/test_security.py -v
python -m pytest tests/test_error_scenarios.py -v
```

**Coverage:** 85%+ (33+ tests)

### Frontend Tests
```bash
cd frontend

# Unit tests
npm test

# Watch mode
npm run test:watch

# E2E tests (Playwright)
npm run e2e
npm run e2e:ui  # Open UI
npm run e2e:debug  # Debug mode
```

**Coverage:** 78%+ (46+ tests)

### Type Checking
```bash
cd frontend
npm run typecheck  # TypeScript strict mode

cd ../backend
mypy app/  # Python type checking
```

## 📚 Documentation

- [Quick Start & Verification](docs/README.md) - Complete setup guide
- [Backend Setup](backend/BACKEND_SETUP.md) - Detailed backend configuration
- [Architecture Decisions (ADRs)](docs/adr/) - Technology choices explained
  - [001: FastAPI Backend](docs/adr/001-fastapi-backend.md)
  - [002: PostgreSQL Database](docs/adr/002-postgresql-database.md)
  - [003: Celery Background Jobs](docs/adr/003-celery-background-jobs.md)
  - [004: Docker Compose Development](docs/adr/004-docker-compose-dev.md)
  - [005: Prometheus + Grafana Monitoring](docs/adr/005-prometheus-grafana-monitoring.md)
  - [006: React + TypeScript Frontend](docs/adr/006-react-typescript-frontend.md)
- [Security Implementation](docs/SECURITY.md) - OWASP compliance details
- [Performance Benchmarks](docs/PERFORMANCE.md) - Latency, throughput, scaling
- [Deployment Runbooks](RUNBOOKS.md) - Production deployment procedures
- [TypeScript Migration](FRONTEND_MIGRATION.md) - Migration strategy & status
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md) - Phase by phase breakdown

## 🛠️ Development Workflow

### Running Locally

```bash
# Backend (automatic reload on code changes)
cd backend
docker compose --env-file ../.env up --build

# Frontend (separate terminal)
cd frontend
npm run dev

# Run tests in watch mode
npm run test:watch

# Format and lint code
npm run format
npm run lint:fix
```

### Git Workflow

```bash
git checkout -b feature/my-feature
# Make changes...
git push origin feature/my-feature
# Create Pull Request on GitHub
# (Automated tests run, security checks pass)
```

**All PRs must pass:**
- ✅ Backend tests (33 tests)
- ✅ Frontend tests (46 tests)
- ✅ E2E tests (10+ critical paths)
- ✅ Type checking (TypeScript strict mode)
- ✅ Linting (ESLint + Bandit)
- ✅ Security scanning (Dependabot + npm audit)

## 📈 Monitoring & Observability

### Grafana Dashboards

Pre-configured dashboards available at `http://localhost:3001` (admin/admin):

1. **API Performance** - Request latency, throughput, error rates
2. **Resource Usage** - CPU, memory, disk I/O
3. **Database Performance** - Query latency, connection pool
4. **Celery Jobs** - Background task execution metrics
5. **Security Events** - Auth failures, rate limit hits

### Alerting

Alerts are configured to trigger on:
- Error rate > 5% (5-minute window)
- P95 latency > 1 second
- Failed background jobs
- Database connection pool exhaustion

### Logs

Centralized logging via Loki at `http://localhost:3100` (query in Grafana):
```
{job="api"} | json | level="error"
```

## 🚀 Deployment

### Docker Compose (Development)
```bash
docker compose --env-file .env up --build
```

### Production (Multi-Stage Build)
```bash
docker build -f backend/Dockerfile.api -t satellite-api:latest .
docker run -e DB_PASSWORD=secret ... satellite-api:latest
```

See [RUNBOOKS.md](RUNBOOKS.md) for full deployment procedures, health checks, and rollback procedures.

## 📋 Checklists

### Pre-Deployment Verification
- [ ] All tests passing (backend + frontend + E2E)
- [ ] No TypeScript errors or warnings
- [ ] No security vulnerabilities (Bandit + npm audit)
- [ ] Performance benchmarks meet targets
- [ ] Monitoring dashboards operational
- [ ] Logs flowing to Loki

### Post-Deployment Verification
- [ ] Health checks passing
- [ ] API responding to requests
- [ ] Database migrations completed
- [ ] Monitoring alerts operational
- [ ] No error rate spikes

See [docs/README.md](docs/README.md) for complete verification checklist.

## 📊 Project Statistics

- **Code Lines:** 5,000+ (backend) + 3,000+ (frontend)
- **Tests:** 33 backend + 46 frontend + 10 E2E = **89 total**
- **Coverage:** Backend 85%, Frontend 78%
- **CI/CD Workflows:** 5 (tests, docker build, security, etc.)
- **Documentation Pages:** 10+
- **Architecture Decision Records:** 6
- **Supported Satellites:** 1,000+ (via TLE data)

## 🎓 Learning Outcomes

This project demonstrates:

1. **Full-Stack Development** - React frontend + FastAPI backend + PostgreSQL
2. **Production Thinking** - Testing, monitoring, security, logging
3. **DevOps Skills** - Docker, CI/CD, containerization
4. **Software Architecture** - Decision making, trade-offs, scalability
5. **Security Best Practices** - OWASP compliance, authentication, encryption
6. **Code Quality** - Type safety (TypeScript), testing, documentation

## 🤝 Contributing

This is a personal portfolio project. However, you're welcome to:
- ⭐ Star if you find it interesting
- 🐛 Report issues
- 💬 Discuss architectural decisions

## 📝 License

MIT - See [LICENSE](LICENSE)

## 🙋 Author

Adrian Cardona - [GitHub](https://github.com/adrian-1-cardona) | [LinkedIn](https://linkedin.com/in/adrian-cardona)

- Running the backend with Docker or locally: see [`backend/BACKEND_SETUP.md`](backend/BACKEND_SETUP.md).
- Project overview, API list, and verification pathway: see [`docs/README.md`](docs/README.md).
- Frontend placeholder: open [`frontend/index.html`](frontend/index.html) in a browser.

`.env` and `.env.example` live at the workspace root. Docker Compose and local processes read them from this location (see `backend/BACKEND_SETUP.md` for the exact commands).
