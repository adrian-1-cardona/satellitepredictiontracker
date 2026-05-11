# ADR-005: Prometheus + Grafana for Monitoring

## Status
**ACCEPTED**

## Context

Need visibility into production system behavior: request latencies, error rates, resource usage, application-level metrics.

Options:
1. **Prometheus + Grafana**: Open-source, time-series, powerful queries
2. **ELK Stack**: Log-focused, heavier, more complex
3. **CloudWatch**: Vendor lock-in (AWS)
4. **Datadog**: Excellent but expensive, not free
5. **No monitoring**: High risk for production

## Decision

**Use Prometheus for metrics collection and Grafana for visualization.**

Also use **Loki + Promtail** for centralized logging (free, lightweight alternative to ELK).

## Rationale

### Prometheus
1. **Time-series database**: Built for operational metrics
2. **Pull model**: Server scrapes `/metrics` endpoint (simpler)
3. **PromQL language**: Powerful queries for alerting
4. **No agents needed**: Single binary, easy deployment

### Grafana
1. **Beautiful dashboards**: Professional visualization
2. **Rich query builder**: PromQL autocomplete, templates
3. **Alerting integration**: Automatic alerts via Prometheus rules
4. **Open-source**: Full-featured free version

### Loki
1. **Log aggregation**: Like Prometheus but for logs
2. **Same query language**: LeQL is similar to PromQL
3. **Low resource usage**: Lightweight compared to ELK
4. **Built for Grafana**: First-class integration

## Implemented Metrics

### Application Metrics
- `http_request_duration_seconds` (histogram)
- `http_requests_total` (counter)
- `http_requests_in_progress` (gauge)
- `celery_task_duration_seconds` (histogram)
- `database_query_duration_seconds` (histogram)

### System Metrics
- CPU, memory, disk usage
- Database connection pool status
- Redis memory/hit ratio
- Celery worker availability

### Example Alerts

```yaml
- alert: HighErrorRate
  expr: rate(http_requests_total{status="5xx"}[5m]) > 0.05
  for: 5m
  annotations:
    summary: "High error rate detected"

- alert: SlowPredictions
  expr: histogram_quantile(0.95, http_request_duration_seconds{endpoint="/predict"}) > 0.5
  for: 10m
  annotations:
    summary: "Predictions taking >500ms"
```

## Architecture

```
API → Prometheus Exporter
       ↓
   Prometheus (scrapes every 15s)
       ↓
   Grafana (queries Prometheus)
       ↓
   Dashboard + Alerts

Logs → Promtail (ships logs)
         ↓
      Loki (stores)
         ↓
      Grafana (visualizes)
```

## Dashboard Examples

Pre-configured dashboards:
- API Latency & Throughput
- Database Performance
- Celery Job Metrics
- Resource Utilization
- Error Rates & Trends

Access: `http://localhost:3001` (admin/admin)

## Cost Analysis

| Stack | Cost | Ops Burden |
|-------|------|-----------|
| Prometheus + Grafana + Loki | **$0/month** | Minimal |
| ELK Stack | $100-500/month | Medium |
| Datadog | $500-2000/month | Minimal (managed) |
| CloudWatch | $50-200/month | Minimal (AWS lock-in) |

**This project**: Free, self-hosted, portable.

## Benefits for Portfolio

- Shows production monitoring mindset
- Demonstrates observability knowledge
- Ability to debug production issues
- Alerting setup is professional-grade
- Resume bullet: "Implemented comprehensive observability stack"

## Related Decisions

- ADR-004: Docker Compose (includes Prometheus, Grafana, Loki services)

---

**Decision Made:** May 2026
**Last Updated:** May 11, 2026
