# ADR-003: Celery for Background Jobs

## Status
**ACCEPTED**

## Context

Satellite pass predictions are computationally expensive (~250ms each). Running these synchronously in HTTP handlers blocks users.

Options:
1. **Celery**: Distributed task queue, Python-focused, mature
2. **Bull/Agenda**: Node.js task queues
3. **AWS Lambda**: Serverless, but vendor lock-in
4. **Threading**: Simple but limited scalability

## Decision

**Use Celery** with Redis broker for background job processing.

## Rationale

1. **Async Computation**
   - Prediction can run in background
   - HTTP response returns immediately (job ID)
   - Client polls or uses WebSocket for updates

2. **Scalability**
   - Workers can be distributed across machines
   - Horizontal scaling: add more worker processes
   - Our load test: 50 predictions in parallel

3. **Retry & Error Handling**
   - Automatic retries for failed jobs
   - Dead-letter queue for analysis
   - Exponential backoff

4. **Monitoring**
   - Celery Flower UI shows job status
   - Prometheus metrics via custom middleware
   - Dead letter metrics for alerting

5. **Python Native**
   - Works seamlessly with FastAPI
   - Same language as backend
   - Rich ecosystem (celery-beat for scheduling)

## Task Examples

```python
@app.celery.task
async def predict_satellite_pass(location_id: int):
    """Predict satellite passes for a location."""
    # This runs in background, not blocking HTTP handler
    # Takes ~250ms per location
    location = Location.query.get(location_id)
    passes = skyfield_predict(location)
    save_results(passes)
    return {"status": "success", "count": len(passes)}

# In HTTP handler:
@app.post("/passes/predict")
async def create_prediction(req: PredictionRequest):
    task = predict_satellite_pass.delay(req.location_id)
    return {"task_id": task.id}  # Return immediately!
```

## Architecture

```
HTTP Handler → Queue (Redis) → Celery Workers
                              ↓
                         (Process job)
                              ↓
                         Database (save results)
                              ↓
                        WebSocket → Client
```

## Consequences

### Positive ✅
- Non-blocking HTTP responses
- Scales with load
- Automatic retries & error handling
- Monitoring & observability
- Graceful degradation if workers down

### Negative ⚠️
- Added complexity (messaging layer)
- Requires Redis running
- Potential job loss if Redis crashes (mitigated: persistence enabled)
- Network latency between broker and workers

## Monitoring

- **Flower UI**: `http://localhost:5555` - real-time job monitoring
- **Prometheus metrics**: `celery_task_duration_seconds`, `celery_task_failures_total`
- **Dead letter queue**: Failed jobs stored for analysis

## Related Decisions

- ADR-001: FastAPI (provides async support for workers)
- ADR-005: Redis (used as Celery broker)

---

**Decision Made:** May 2026
**Last Updated:** May 11, 2026
