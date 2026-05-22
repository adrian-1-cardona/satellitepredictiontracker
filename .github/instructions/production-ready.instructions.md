---
name: production-ready
description: "Production-readiness enforcement: Rate limiting on ALL endpoints, admin endpoint protection, secrets validation, pagination, metrics security, and request validation. Use when: adding/modifying FastAPI endpoints, updating docker-compose, changing config, or securing infrastructure."
applyTo: ["backend/**/*.py", "backend/docker-compose.yml", "docker-compose.prod.yml", "backend/requirements.txt"]
---

# Production-Ready API Enforcement

This instruction ensures all changes follow production-ready patterns across rate limiting, security, API design, and infrastructure.

## 1. Rate Limiting (CRITICAL - 0 Exceptions)

**Rule**: Every endpoint MUST have explicit rate limiting.

### Pattern
```python
from app.middleware import limiter

@router.get("/passes")
@limiter.limit("100/minute")  # REQUIRED
def list_passes(...):
    ...
```

### Endpoint Rate Limits
| Endpoint Type | Default | Examples |
|---------------|---------|----------|
| **Public** (register, login) | 5/minute | `/auth/register`, `/auth/login` |
| **General API** (list, get) | 100/minute | `/passes`, `/locations`, `/alerts` |
| **Expensive ops** (refresh, calculate) | 10/minute | `/passes/refresh`, `/predictions/compute` |
| **Admin** | 50/minute | `/admin/stats`, `/admin/users` |

### Implementation Checklist
- [ ] `@limiter.limit()` decorator present on EVERY endpoint
- [ ] Rates match table above (or documented override)
- [ ] Error responses include `Retry-After` header (slowapi handles this)
- [ ] Test: `test_rate_limit_enforced_on_endpoint` exists

### Common Mistake
❌ **Bad**: `limiter = Limiter()` initialized but decorators never applied
✅ **Good**: Every route has `@limiter.limit("requests/minute")`

---

## 2. Admin Endpoint Protection (CRITICAL)

**Rule**: Admin endpoints must verify admin role OR token on the endpoint itself, not just docs.

### Pattern
```python
from app.auth import get_current_admin_user  # Must implement

@router.get("/admin/stats")
def admin_stats(current_user: User = Depends(get_current_admin_user)):
    # Only admins reach this
    ...
```

### Admin Endpoints Requiring Protection
- `/admin/stats`
- `/admin/job-status`
- `/admin/job-status/{task_id}`
- `/admin/users`
- `/admin/cleanup`

### Implementation Checklist
- [ ] `get_current_admin_user()` dependency created (verifies `user.is_admin == True`)
- [ ] ALL `/admin/*` endpoints use `Depends(get_current_admin_user)`
- [ ] Non-admin users get `403 Forbidden`, not `401 Unauthorized`
- [ ] Admin token still protects `/admin/docs`, `/admin/redoc`, `/admin/openapi.json`
- [ ] Test: Non-admin users cannot access `/admin/stats`

### What NOT to do
❌ Only protect docs endpoints
❌ Rely on filtering within endpoint (insufficient)
✅ Enforce at dependency layer

---

## 3. Secrets Management (CRITICAL)

**Rule**: No hardcoded secrets in code or docker-compose.

### Pattern
```python
# config.py - use environment variables
secret_key: str = Field(..., alias="SECRET_KEY")
db_password: str = Field(..., alias="DB_PASSWORD")

# Production validation
@model_validator(mode="after")
def validate_production_settings(self) -> "Settings":
    if self.production:
        if self.secret_key in PLACEHOLDER_SECRET_KEYS:
            raise ValueError("SECRET_KEY must be a real secret in production")
    return self
```

### Implementation Checklist
- [ ] `.env` file never committed (in `.gitignore`)
- [ ] All secrets passed via environment variables, not file defaults
- [ ] docker-compose uses `env_file: ../.env` (not inline `environment:`)
- [ ] Production validation catches placeholder secrets
- [ ] No secrets in docker-compose.prod.yml (use secret management: Vault, Azure Key Vault, etc.)
- [ ] Example `.env.example` documents required variables
- [ ] Test: Production config with placeholder secret raises `ValueError`

### Required Env Vars
```env
SECRET_KEY=<64-char-random-string>
DB_PASSWORD=<secure-password>
ADMIN_TOKEN=<random-token>
DATABASE_URL=postgresql+psycopg2://tracker:<password>@host:5432/satellite_tracker
REDIS_URL=redis://<host>:6379
```

---

## 4. API Pagination (HIGH PRIORITY)

**Rule**: All list endpoints returning multiple records must support pagination.

### Pattern
```python
from fastapi import Query

@router.get("/passes")
def list_passes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),  # Cap at 500
    ...
) -> dict[str, Any]:
    passes = db.query(SatellitePass)\
        .offset(skip)\
        .limit(limit)\
        .all()
    return {
        "data": [PassOut.model_validate(p) for p in passes],
        "count": len(passes),
        "skip": skip,
        "limit": limit,
    }
```

### Endpoints Requiring Pagination
- `/passes` (currently unbounded)
- `/passes/history`
- `/admin/job-status`
- `/admin/users`
- `/alerts/history`
- `/locations`

### Implementation Checklist
- [ ] All list endpoints accept `skip` and `limit` query parameters
- [ ] `limit` capped at 500 (prevent memory DoS)
- [ ] Response includes pagination metadata: `count`, `skip`, `limit`
- [ ] Default `limit=50` (reasonable default)
- [ ] Invalid `limit > 500` returns `400 Bad Request`
- [ ] Test: `/passes?limit=1000` returns HTTP 400 or silently caps to 500

---

## 5. Metrics Endpoint Protection (HIGH PRIORITY)

**Rule**: `/metrics` endpoint must require authentication or be hidden from production.

### Pattern
```python
from app.auth import get_current_user

@app.get("/metrics")
def metrics(current_user: User = Depends(get_current_user)) -> Response:
    """Prometheus metrics (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
```

### Alternative (Production Only)
```python
# In main.py
if settings.production:
    # Remove metrics endpoint, expose only via internal monitoring port
    pass
else:
    @app.get("/metrics")
    def metrics():
        ...
```

### Implementation Checklist
- [ ] `/metrics` requires authentication
- [ ] Non-admin users get `403 Forbidden`
- [ ] OR: `/metrics` excluded from production deployment entirely
- [ ] Prometheus scrapes via internal network (not internet-facing)
- [ ] Test: Unauthenticated `/metrics` request returns `401` or `403`

---

## 6. Request Validation & Limits (HIGH PRIORITY)

**Rule**: Validate all user input; enforce request size limits.

### Pattern
```python
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError

# In main.py
app = FastAPI()

# Add request size limit middleware
@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    if request.method in ["POST", "PUT", "PATCH"]:
        if content_length := request.headers.get("content-length"):
            if int(content_length) > 10 * 1024 * 1024:  # 10 MB limit
                return JSONResponse(
                    status_code=413,
                    content={"error": "Request body too large"}
                )
    return await call_next(request)
```

### Validation Checklist
- [ ] All POST/PUT/PATCH payloads validated with Pydantic models
- [ ] Latitude/longitude bounds enforced: `-90 to 90` / `-180 to 180`
- [ ] Satellite names sanitized (no SQL injection patterns)
- [ ] Email validation on registration/update
- [ ] Request body size limit: 10 MB maximum
- [ ] Query parameter limits: `limit <= 500`, `days_ahead <= 365`
- [ ] Test: `POST /locations` with lat=91 returns `422 Unprocessable Entity`

### Example Validation
```python
class LocationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    elevation_m: float = Field(default=0, ge=-500, le=8848)
```

---

## 7. Database Connection Tuning (MEDIUM PRIORITY)

**Rule**: Configure connection pools and timeouts for production load.

### Pattern
```python
# config.py
db_pool_size: int = Field(20, alias="DB_POOL_SIZE")  # Increase from 10
db_max_overflow: int = Field(40, alias="DB_MAX_OVERFLOW")  # Increase from 20
db_connect_timeout: int = Field(10, alias="DB_CONNECT_TIMEOUT")
db_pool_recycle: int = Field(3600, alias="DB_POOL_RECYCLE")

# database.py
engine = create_engine(
    url,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_recycle=settings.db_pool_recycle,  # Recycle connections every hour
    connect_args={"timeout": settings.db_connect_timeout},
    echo_pool=settings.debug,  # Log pool events in debug mode
)
```

### Production Values
```env
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=40
DB_CONNECT_TIMEOUT=10
DB_POOL_RECYCLE=3600
```

### Implementation Checklist
- [ ] Connection pool size ≥ 20 (concurrent requests)
- [ ] Pool overflow ≥ 40 (temporary spike buffer)
- [ ] Connection recycling enabled (prevents stale connections)
- [ ] Connect timeout set (prevents hanging requests)
- [ ] Retry logic on transient DB errors (optional but recommended)
- [ ] Test: `ab -n 100 -c 50 http://localhost:8000/api/v1/locations` doesn't exhaust pool

---

## 8. HTTPS/TLS Guidance (MEDIUM PRIORITY)

**Rule**: Production deployments require HTTPS; development can use HTTP.

### Pattern (docker-compose.prod.yml)
```yaml
services:
  api:
    ports:
      - "443:8000"  # Expose HTTPS port
    environment:
      - APP_ENVIRONMENT=production
      - APP_PRODUCTION=true
      - FORCE_HTTPS=true  # Add security headers
  nginx:  # Reverse proxy for TLS termination
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - /etc/letsencrypt/live/youromain.com:/certs  # SSL certs
```

### Implementation Checklist
- [ ] Production deployment uses HTTPS (443)
- [ ] TLS termination via nginx/load balancer (not FastAPI)
- [ ] SSL certificates managed (Let's Encrypt recommended)
- [ ] HTTP → HTTPS redirect configured
- [ ] HSTS header enabled: `Strict-Transport-Security: max-age=31536000`
- [ ] Mixed content warnings resolved
- [ ] Development can use HTTP (localhost)
- [ ] Test: `curl -I https://yourdomain.com/api/v1/health` returns 200

### Add to SecurityHeadersMiddleware
```python
response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
```

---

## 9. Error Handling & Logging (MEDIUM PRIORITY)

**Rule**: Consistent error responses; never expose internal details in production.

### Pattern
```python
# error_handlers.py - already good, but ensure:
async def generic_exception_handler(request: Request, exc: Exception):
    error_response = ErrorResponse(
        error="INTERNAL_ERROR",
        message="An unexpected error occurred" if settings.production else str(exc),
        status_code=500,
        request_id=getattr(request.state, "request_id", None),
    )
    # Log the actual error for debugging
    logger.error(f"Unhandled exception: {exc}", extra={"request_id": error_response["request_id"]})
    return JSONResponse(content=dict(error_response), status_code=500)
```

### Implementation Checklist
- [ ] All errors include `request_id` for tracing
- [ ] Production: Never expose stack traces to client
- [ ] Development: Stack traces logged to logs, not response
- [ ] All error responses follow `{"error": "CODE", "message": "...", "request_id": "..."}`
- [ ] HTTP status codes correct (401 auth, 403 forbidden, 404 not found, 422 validation, 429 rate limit)
- [ ] Test: `/nonexistent` returns 404, not 500

---

## 10. Deployment Readiness Checklist

### Before Merging to Production
```
Rate Limiting:
  ✅ All endpoints have @limiter.limit() decorators
  ✅ Rates appropriate (5/min for auth, 100/min for general)
  ✅ test_rate_limiting_enforced_on_all_endpoints passes

Security:
  ✅ No placeholder secrets in code
  ✅ Production validation catches hardcoded secrets
  ✅ Admin endpoints require is_admin role
  ✅ /metrics requires authentication
  ✅ HTTPS configured in production

API Design:
  ✅ All list endpoints paginated (skip/limit)
  ✅ Request size limit enforced (10 MB)
  ✅ All query parameters validated (bounds, types)
  ✅ Error responses consistent, no internal details leaked

Database:
  ✅ Pool size ≥ 20, overflow ≥ 40
  ✅ Connection recycling enabled
  ✅ Connect timeout set
  ✅ Load test passes: ab -n 100 -c 50

Testing:
  ✅ All new endpoints have security tests
  ✅ test_admin_endpoints_require_admin_role passes
  ✅ test_rate_limiting_enforced passes
  ✅ test_unauthenticated_cannot_access_metrics passes
  ✅ test_pagination_enforced passes
```

---

## When This Instruction Applies

✅ Adding a new FastAPI endpoint
✅ Modifying `docker-compose.yml` or `docker-compose.prod.yml`
✅ Changing settings/config validation
✅ Creating middleware or error handlers
✅ Reviewing pull requests for production readiness

❌ Not for: bug fixes in unrelated code, frontend changes, documentation updates
