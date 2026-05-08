from datetime import datetime, timedelta, timezone

from celery import Celery
from celery.schedules import crontab
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import SessionLocal
from app.models import Alert, AlertHistory, JobHistory, Location, SatellitePass, utcnow
from app.satellites import load_tle_records, predict_passes


settings = get_settings()
celery_app = Celery("satellite_tracker", broker=settings.broker_url, backend=settings.result_backend)
celery_app.conf.timezone = "UTC"
celery_app.conf.task_track_started = True


def record_job(db: Session, task_id: str, job_type: str, status: str, progress: int = 0, result: str | None = None, error: str | None = None) -> JobHistory:
    job = db.query(JobHistory).filter(JobHistory.task_id == task_id).first()
    if not job:
        job = JobHistory(task_id=task_id, job_type=job_type)
    job.status = status
    job.progress = progress
    job.result = result
    job.error = error
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def upsert_passes_for_location(db: Session, location: Location, days_ahead: int | None = None) -> int:
    days = days_ahead or settings.prediction_days
    predictions = predict_passes(
        latitude=location.latitude,
        longitude=location.longitude,
        elevation_m=location.elevation_m,
        days_ahead=days,
    )
    expires_at = datetime.now(timezone.utc) + timedelta(days=days)
    inserted = 0
    for prediction in predictions:
        existing = (
            db.query(SatellitePass)
            .filter(
                SatellitePass.location_id == location.id,
                SatellitePass.satellite_name == prediction.satellite_name,
                SatellitePass.rise_time == prediction.rise_time,
            )
            .first()
        )
        if existing:
            existing.culmination_time = prediction.culmination_time
            existing.set_time = prediction.set_time
            existing.max_elevation = prediction.max_elevation
            existing.brightness = prediction.brightness
            existing.pass_quality = prediction.pass_quality
            existing.predicted_at = utcnow()
            existing.expires_at = expires_at
        else:
            db.add(
                SatellitePass(
                    location_id=location.id,
                    satellite_name=prediction.satellite_name,
                    rise_time=prediction.rise_time,
                    culmination_time=prediction.culmination_time,
                    set_time=prediction.set_time,
                    max_elevation=prediction.max_elevation,
                    brightness=prediction.brightness,
                    pass_quality=prediction.pass_quality,
                    expires_at=expires_at,
                )
            )
            inserted += 1
    db.commit()
    return inserted


def enqueue_prediction(location_id: int) -> str:
    try:
        result = predict_passes_for_location.delay(location_id)
        return str(result.id)
    except Exception:
        # Local/test fallback when Redis is not running: compute synchronously.
        predict_passes_for_location.apply(args=(location_id,))
        return "synchronous"


@celery_app.task(bind=True, max_retries=3, autoretry_for=(Exception,), retry_backoff=True)
def predict_passes_for_location(self, location_id: int, days_ahead: int | None = None) -> dict:
    db = SessionLocal()
    task_id = getattr(self.request, "id", None) or f"sync-location-{location_id}"
    try:
        record_job(db, task_id, "predict_passes_for_location", "started", 10)
        location = db.get(Location, location_id)
        if not location:
            raise ValueError(f"Location {location_id} not found")
        count = upsert_passes_for_location(db, location, days_ahead=days_ahead)
        record_job(db, task_id, "predict_passes_for_location", "completed", 100, result=f"{count} passes inserted")
        return {"location_id": location_id, "passes_inserted": count}
    except Exception as exc:
        record_job(db, task_id, "predict_passes_for_location", "failed", 100, error=str(exc))
        raise
    finally:
        db.close()


@celery_app.task()
def predict_passes_for_all_locations() -> dict:
    db = SessionLocal()
    try:
        location_ids = [row[0] for row in db.query(Location.id).all()]
        for location_id in location_ids:
            predict_passes_for_location.delay(location_id)
        return {"locations_queued": len(location_ids)}
    finally:
        db.close()


@celery_app.task()
def check_and_send_alerts() -> dict:
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        soon = now + timedelta(hours=24)
        upcoming = db.query(SatellitePass).filter(SatellitePass.rise_time >= now, SatellitePass.rise_time <= soon).all()
        sent = 0
        for pass_record in upcoming:
            alerts = (
                db.query(Alert)
                .filter(
                    Alert.location_id == pass_record.location_id,
                    Alert.enabled.is_(True),
                    Alert.min_elevation <= pass_record.max_elevation,
                    or_(Alert.satellite_name.is_(None), Alert.satellite_name == pass_record.satellite_name),
                    or_(
                        Alert.max_brightness.is_(None),
                        Alert.max_brightness >= (pass_record.brightness if pass_record.brightness is not None else 999.0),
                    ),
                )
                .all()
            )
            for alert in alerts:
                already_sent = (
                    db.query(AlertHistory)
                    .filter(AlertHistory.alert_id == alert.id, AlertHistory.pass_id == pass_record.id)
                    .first()
                )
                if already_sent:
                    continue
                db.add(
                    AlertHistory(
                        alert_id=alert.id,
                        pass_id=pass_record.id,
                        delivery_status="sent",
                        message=f"{pass_record.satellite_name} pass at {pass_record.rise_time.isoformat()}",
                    )
                )
                sent += 1
        db.commit()
        return {"alerts_sent": sent}
    finally:
        db.close()


@celery_app.task()
def cleanup_expired_passes() -> dict:
    db = SessionLocal()
    try:
        deleted = db.query(SatellitePass).filter(SatellitePass.expires_at < datetime.now(timezone.utc)).delete()
        db.commit()
        return {"passes_deleted": deleted}
    finally:
        db.close()


@celery_app.task()
def refresh_tle_data() -> dict:
    records = load_tle_records(refresh=True)
    return {"satellites_loaded": len(records)}


@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs) -> None:
    sender.add_periodic_task(crontab(minute=0, hour="*/6"), predict_passes_for_all_locations.s(), name="refresh-passes-every-6h")
    sender.add_periodic_task(30 * 60, check_and_send_alerts.s(), name="check-alerts-every-30m")
    sender.add_periodic_task(crontab(minute=0, hour=3), cleanup_expired_passes.s(), name="cleanup-expired-passes")
    sender.add_periodic_task(crontab(minute=15, hour=2), refresh_tle_data.s(), name="refresh-tle-daily")
