# Satellite Tracker Production Runbooks

## Table of Contents
1. [Deployment](#deployment)
2. [Rollback](#rollback)
3. [Incident Response](#incident-response)
4. [Backup & Restore](#backup--restore)
5. [Monitoring](#monitoring)
6. [Database Migrations](#database-migrations)

---

## Deployment

### Prerequisites
- VPS with Docker & Docker Compose installed
- Environment file (`.env`) with production secrets
- SSH access to VPS
- GHCR credentials for pulling images

### Deployment Steps

1. **Prepare the server**
   ```bash
   # SSH into VPS
   ssh user@vps-address

   # Create application directory
   mkdir -p /opt/satellite-tracker
   cd /opt/satellite-tracker

   # Create required directories
   mkdir -p data logs backups
   ```

2. **Pull production compose and config files**
   ```bash
   # Copy docker-compose.prod.yml
   wget https://raw.githubusercontent.com/adrian-1-cardona/satellitepredictiontracker/main/docker-compose.prod.yml

   # Copy monitoring configs
   wget https://raw.githubusercontent.com/adrian-1-cardona/satellitepredictiontracker/main/backend/prometheus.yml
   wget https://raw.githubusercontent.com/adrian-1-cardona/satellitepredictiontracker/main/backend/loki-config.yml
   wget https://raw.githubusercontent.com/adrian-1-cardona/satellitepredictiontracker/main/backend/promtail-config.yml
   ```

3. **Configure production environment**
   ```bash
   # Copy and edit .env file (must contain production secrets)
   cp .env.example .env
   nano .env

   # Critical production settings:
   # - APP_PRODUCTION=true
   # - APP_DEBUG=false
   # - SECRET_KEY=<strong-random-key>
   # - ADMIN_TOKEN=<strong-random-token>
   # - DB_PASSWORD=<strong-password>
   # - S3 credentials (if using S3 backups)
   ```

4. **Deploy services**
   ```bash
   # Pull latest images
   docker-compose -f docker-compose.prod.yml pull

   # Start all services
   docker-compose -f docker-compose.prod.yml up -d

   # Verify all containers are running
   docker-compose -f docker-compose.prod.yml ps
   ```

5. **Smoke tests**
   ```bash
   # Wait 30 seconds for API startup
   sleep 30

   # Check API health
   curl http://localhost:8000/health

   # Check readiness
   curl http://localhost:8000/ready

   # Check metrics
   curl http://localhost:8000/metrics | head -20

   # Check frontend
   curl http://localhost:3000

   # Check Grafana
   curl http://localhost:3001
   ```

### Deployment Verification Checklist
- [ ] API returns 200 on `/health`
- [ ] API returns readiness on `/ready`
- [ ] Metrics endpoint accessible
- [ ] Frontend loads without errors
- [ ] Grafana dashboard accessible
- [ ] Database contains migrated schema
- [ ] Celery worker processing jobs
- [ ] No errors in container logs

---

## Rollback

### Quick Rollback (to previous version)

1. **Stop current deployment**
   ```bash
   docker-compose -f docker-compose.prod.yml down
   ```

2. **Switch to previous image tags**
   ```bash
   # Edit docker-compose.prod.yml to point to previous version tag
   # Update image versions for api, frontend, celery services
   # Example: ghcr.io/owner/api:main-abc123 → ghcr.io/owner/api:main-previous
   ```

3. **Restart with previous version**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. **Verify rollback**
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f api
   curl http://localhost:8000/health
   ```

### Database Rollback (if migration failed)

1. **Check Alembic migration history**
   ```bash
   docker exec satellite-tracker-api alembic history
   ```

2. **Rollback to previous schema**
   ```bash
   docker exec satellite-tracker-api alembic downgrade -1
   ```

3. **Verify schema**
   ```bash
   docker exec satellite-tracker-postgres psql -U tracker -d satellite_tracker -c "SELECT * FROM alembic_version;"
   ```

---

## Incident Response

### API is not responding

1. **Check logs**
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f api
   docker-compose -f docker-compose.prod.yml logs -f celery_worker
   ```

2. **Check health status**
   ```bash
   curl -v http://localhost:8000/health
   curl -v http://localhost:8000/ready
   ```

3. **Restart API container**
   ```bash
   docker-compose -f docker-compose.prod.yml restart api
   ```

4. **If issue persists, check database**
   ```bash
   docker exec satellite-tracker-postgres pg_isready
   docker exec satellite-tracker-postgres psql -U tracker -d satellite_tracker -c "SELECT 1;"
   ```

### High memory usage

1. **Check container stats**
   ```bash
   docker stats
   ```

2. **Identify problematic container**
   ```bash
   docker ps
   docker logs <container-id>
   ```

3. **Restart the service**
   ```bash
   docker restart <container-id>
   ```

4. **Check for memory leaks in application logs**
   ```bash
   docker logs --tail=1000 satellite-tracker-api | grep -i "memory\|error"
   ```

### Database connection failures

1. **Check PostgreSQL status**
   ```bash
   docker-compose -f docker-compose.prod.yml logs postgres
   ```

2. **Verify database is running**
   ```bash
   docker exec satellite-tracker-postgres pg_isready -v
   ```

3. **Check connection pool**
   ```bash
   docker exec satellite-tracker-postgres psql -U tracker -c "SELECT count(*) FROM pg_stat_activity;"
   ```

4. **Restart PostgreSQL if needed**
   ```bash
   docker-compose -f docker-compose.prod.yml restart postgres
   ```

### Celery jobs are not processing

1. **Check Celery worker logs**
   ```bash
   docker logs -f satellite-tracker-worker
   ```

2. **Check Redis connection**
   ```bash
   docker exec satellite-tracker-redis redis-cli ping
   ```

3. **Restart Celery worker**
   ```bash
   docker-compose -f docker-compose.prod.yml restart celery_worker
   ```

4. **Check active jobs**
   ```bash
   docker exec satellite-tracker-api python -c "from app.tasks import celery_app; print(celery_app.control.inspect().active())"
   ```

---

## Backup & Restore

### Automated Database Backup

Backups are stored in the `backups/` directory or S3-compatible storage (if configured).

1. **Manual backup**
   ```bash
   docker exec satellite-tracker-postgres pg_dump -U tracker satellite_tracker > backups/db_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Compress backup**
   ```bash
   gzip backups/db_*.sql
   ```

3. **Upload to S3** (if configured)
   ```bash
   aws s3 cp backups/db_*.sql.gz s3://$S3_BUCKET_NAME/backups/
   ```

### Database Restore

1. **List available backups**
   ```bash
   ls -la backups/db_*.sql.gz
   ```

2. **Restore from backup**
   ```bash
   # First, stop the API to release connections
   docker-compose -f docker-compose.prod.yml stop api celery_worker celery_beat

   # Drop existing database (DESTRUCTIVE!)
   docker exec satellite-tracker-postgres dropdb -U tracker satellite_tracker

   # Recreate database
   docker exec satellite-tracker-postgres createdb -U tracker satellite_tracker

   # Restore from backup
   gunzip -c backups/db_YYYYMMDD_HHMMSS.sql.gz | docker exec -i satellite-tracker-postgres psql -U tracker satellite_tracker

   # Restart services
   docker-compose -f docker-compose.prod.yml start api celery_worker celery_beat
   ```

### Volume Backups

1. **Backup data directory**
   ```bash
   tar -czf backups/data_$(date +%Y%m%d_%H%M%S).tar.gz data/
   ```

2. **List backup history**
   ```bash
   du -sh backups/*
   ```

---

## Monitoring

### Grafana Access

1. **Access Grafana dashboard**
   ```
   http://<vps-address>:3001
   ```
   - Default credentials: `admin / admin` (change these!)
   - Pre-configured datasources: Prometheus, Loki
   - Pre-configured dashboards for API metrics, system health

### Key Metrics to Monitor

- **API Request Latency**: `http_request_duration_seconds_bucket`
- **Request Volume**: `http_requests_total`
- **Database Pool**: `db_pool_size`
- **Celery Jobs**: `celery_jobs_total`
- **Memory Usage**: `container_memory_usage_bytes`
- **CPU Usage**: `container_cpu_usage_seconds_total`

### Alert Thresholds (Recommended)

- API response time > 1000ms: Warning
- Error rate > 5%: Alert
- Database connections > pool size: Alert
- Disk space < 20%: Warning
- Memory usage > 85%: Alert

### View Logs in Grafana

1. **Navigate to Logs panel** → Loki data source
2. **Query examples**:
   ```
   {job="docker"}
   {job="docker", container_name="satellite-tracker-api"}
   ```

---

## Database Migrations

### Running Migrations

Migrations run automatically on API container startup:
```bash
# In docker-compose.prod.yml, API service startup:
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app ..."]
```

### Creating New Migrations

1. **From your development machine**
   ```bash
   cd backend
   alembic revision --autogenerate -m "Add new_table column"
   ```

2. **Review the migration** in `alembic/versions/`

3. **Test the migration**
   ```bash
   # On local dev
   alembic upgrade head
   alembic downgrade -1
   alembic upgrade head
   ```

4. **Commit and push**
   ```bash
   git add alembic/versions/
   git commit -m "Add migration: Add new_table column"
   git push
   ```

5. **Deploy** (migration runs automatically on startup)

### Viewing Migration History

```bash
docker exec satellite-tracker-api alembic history
docker exec satellite-tracker-api alembic current
```

---

## Emergency Procedures

### Full System Reset (DESTRUCTIVE!)

```bash
# Remove all containers, volumes, and data
docker-compose -f docker-compose.prod.yml down -v

# Clean up system
docker system prune -f

# Restart fresh
docker-compose -f docker-compose.prod.yml up -d
```

### Debug Mode

1. **Enable debug logs**
   ```bash
   docker-compose -f docker-compose.prod.yml exec api \
     sh -c "export LOG_LEVEL=DEBUG && uvicorn app.main:app --reload"
   ```

2. **Access database directly**
   ```bash
   docker exec -it satellite-tracker-postgres psql -U tracker satellite_tracker
   ```

3. **Redis CLI**
   ```bash
   docker exec -it satellite-tracker-redis redis-cli
   ```

---

## Maintenance Windows

### Recommended Maintenance Schedule
- **Weekly**: Review error logs, check disk space
- **Monthly**: Update base images, verify backups
- **Quarterly**: Full security audit, dependency updates
- **Annually**: Infrastructure review, disaster recovery drill

### Maintenance Command Checklist
```bash
# Update images
docker-compose -f docker-compose.prod.yml pull

# Check logs for errors
docker-compose -f docker-compose.prod.yml logs --tail=500 | grep -i error

# Prune unused objects
docker system prune -f

# View resource usage
docker stats

# Backup database
docker exec satellite-tracker-postgres pg_dump -U tracker satellite_tracker > backups/db_maintenance.sql
```
