# Satellite Tracker Frontend

React/Vite frontend for the FastAPI satellite tracker backend.

## Install

Use Node.js 22 or newer.

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

The dev server is pinned to `http://localhost:3000` so it matches the backend's default CORS configuration.

## Backend URL

Create a local env file when you need to override the default API URL:

```bash
cp .env.example .env
```

Then edit:

```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

For production, set `VITE_API_BASE_URL` to the deployed FastAPI `/api/v1` URL before running `npm run build`.

## Backend Requirements

Start the FastAPI backend on `http://localhost:8000` and make sure PostgreSQL/Redis are running as described in `../backend/BACKEND_SETUP.md`.

The frontend uses these backend routes:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /locations`
- `POST /locations`
- `GET /locations/{id}`
- `GET /passes?location_id=X&days_ahead=12`
- `POST /passes/refresh`
- `GET /alerts`
- `POST /alerts`
- `PATCH /alerts/{id}`
- `DELETE /alerts/{id}`
- `GET /alerts/history`

## Build

```bash
npm run build
```
