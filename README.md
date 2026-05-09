# Satellite Tracker

## Quick Start

### Prerequisites
- Node.js 22+ (for frontend)
- Docker & Docker Compose (for backend)

### Setup

1. **Copy environment file:**
   ```bash
   cp .env.example .env
2. Install frontend dependecies
cd frontend && npm install && cd ..

3. cd backend && docker compose --env-file ../.env up --build
IT IS IMPORTANT YOU WAIT FOR THE APPLICATION STARTUP COMPLETE TO COME UP

4. cd frontend && npm run dev

5. Access the App
Frontend: http://localhost:3000
API Health: http://localhost:8000/health
PgAdmin: http://localhost:5050 (admin@tracker.local / admin)

This repository is organized into three top-level areas:

- **`backend/`** - FastAPI application, Celery workers, Alembic migrations, tests, and the Docker Compose stack.
- **`frontend/`** - Placeholder for the future web UI. Currently ships a single `index.html` page.
- **`docs/`** - Project-level documentation, API overview, and the post-deploy verification pathway.

## Top-Level Layout

```text
.
├── backend/        # FastAPI app, Celery, Alembic, Docker Compose
│   └── BACKEND_SETUP.md
├── frontend/       # Placeholder UI
│   └── index.html
├── docs/           # Project docs and verification pathway
│   └── README.md
├── data/           # Runtime TLE cache (mounted into Compose services)
├── instructions/
├── .env / .env.example
└── README.md       # (this file)
```

## Where to Start

- Running the backend with Docker or locally: see [`backend/BACKEND_SETUP.md`](backend/BACKEND_SETUP.md).
- Project overview, API list, and verification pathway: see [`docs/README.md`](docs/README.md).
- Frontend placeholder: open [`frontend/index.html`](frontend/index.html) in a browser.

`.env` and `.env.example` live at the workspace root. Docker Compose and local processes read them from this location (see `backend/BACKEND_SETUP.md` for the exact commands).
