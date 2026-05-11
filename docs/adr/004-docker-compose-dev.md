# ADR-004: Docker Compose for Local Development

## Status
**ACCEPTED**

## Context

Need a local development environment that mirrors production (PostgreSQL, Redis, API server, worker, monitoring).

Options:
1. **Docker Compose**: Multi-container orchestration, local
2. **Kubernetes**: Production-grade, overkill for local dev
3. **Manual setup**: Install each service separately (error-prone)
4. **Cloud services**: Higher cost, slower iteration

## Decision

**Use Docker Compose** for local development and CI/CD testing.

## Rationale

1. **Production Parity**
   - Development environment mirrors production
   - Catch environment-specific bugs early
   - "Works on my machine" eliminated

2. **One-Command Startup**
   ```bash
   docker-compose up --build
   # Entire stack running: API, database, cache, monitoring
   ```

3. **Deterministic**
   - Same versions of every service
   - Team consistency
   - New developers onboard in 5 minutes

4. **Observability Built-in**
   - Prometheus: `http://localhost:9090`
   - Grafana: `http://localhost:3001`
   - Logs centralized: `http://localhost:3100` (Loki)

## Services

```yaml
services:
  api:          # FastAPI backend
  worker:       # Celery worker
  db:           # PostgreSQL
  cache:        # Redis
  prometheus:   # Metrics collection
  grafana:      # Visualization
  loki:         # Log aggregation
  promtail:     # Log shipper
```

## Limitations

- **Not production deployment**: Compose lacks HA, networking features
- **Single-host only**: Can't scale across machines
- **Not declarative IaC**: Use Terraform/Kubernetes for production

## Production Migration

When moving to production:
1. Extract Compose to Kubernetes YAML
2. Add ingress, TLS, service mesh
3. Use managed services (RDS, ElastiCache)
4. Add auto-scaling, monitoring, backups

## Benefits for Portfolio

- Shows DevOps thinking
- Demonstrates ops/dev parity
- Monitoring setup is production-ready
- CI/CD can use same Compose file

## Related Decisions

- ADR-001: FastAPI (service in Compose)
- ADR-002: PostgreSQL (service in Compose)
- ADR-003: Celery (worker service in Compose)

---

**Decision Made:** May 2026
**Last Updated:** May 11, 2026
