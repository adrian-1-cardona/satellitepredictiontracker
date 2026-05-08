from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Location, SatellitePass, User
from app.schemas import MessageOut, PassOut, RefreshPassesRequest
from app.satellites import list_trackable_satellites
from app.tasks import enqueue_prediction


router = APIRouter(tags=["Satellite Passes"])


def ensure_owned_location(db: Session, user_id: int, location_id: int) -> Location:
    location = db.get(Location, location_id)
    if not location or location.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    return location


@router.get("/passes", response_model=list[PassOut])
def list_passes(
    location_id: int | None = None,
    days_ahead: int = Query(12, ge=1, le=30),
    satellite_name: str | None = None,
    min_elevation: float | None = Query(None, ge=0, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SatellitePass]:
    location_ids_query = db.query(Location.id).filter(Location.user_id == current_user.id)
    if location_id is not None:
        ensure_owned_location(db, current_user.id, location_id)
        location_ids_query = location_ids_query.filter(Location.id == location_id)

    location_ids = [row[0] for row in location_ids_query.all()]
    if not location_ids:
        return []

    now = datetime.now(timezone.utc)
    query = db.query(SatellitePass).filter(
        SatellitePass.location_id.in_(location_ids),
        SatellitePass.rise_time >= now,
        SatellitePass.rise_time <= now + timedelta(days=days_ahead),
    )
    if satellite_name:
        query = query.filter(SatellitePass.satellite_name == satellite_name)
    if min_elevation is not None:
        query = query.filter(SatellitePass.max_elevation >= min_elevation)
    return query.order_by(SatellitePass.rise_time.asc()).all()


@router.post("/passes/refresh", response_model=MessageOut)
def refresh_passes(
    payload: RefreshPassesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    ensure_owned_location(db, current_user.id, payload.location_id)
    task_id = enqueue_prediction(payload.location_id)
    return {"message": f"Pass refresh queued: {task_id}"}


@router.get("/passes/stats")
def pass_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    location_ids = [row[0] for row in db.query(Location.id).filter(Location.user_id == current_user.id).all()]
    if not location_ids:
        return {"total_passes": 0, "excellent_passes": 0, "next_pass": None}
    total = db.query(SatellitePass).filter(SatellitePass.location_id.in_(location_ids)).count()
    excellent = (
        db.query(SatellitePass)
        .filter(SatellitePass.location_id.in_(location_ids), SatellitePass.pass_quality == "excellent")
        .count()
    )
    next_pass = (
        db.query(SatellitePass)
        .filter(SatellitePass.location_id.in_(location_ids), SatellitePass.rise_time >= datetime.now(timezone.utc))
        .order_by(SatellitePass.rise_time.asc())
        .first()
    )
    return {"total_passes": total, "excellent_passes": excellent, "next_pass": PassOut.model_validate(next_pass).model_dump(mode="json") if next_pass else None}


@router.get("/satellites")
def satellites(limit: int = Query(100, ge=1, le=500)) -> dict:
    return {"satellites": list_trackable_satellites(limit=limit)}


@router.get("/passes/{pass_id}", response_model=PassOut)
def get_pass(
    pass_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SatellitePass:
    pass_record = db.get(SatellitePass, pass_id)
    if not pass_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pass not found")
    ensure_owned_location(db, current_user.id, pass_record.location_id)
    return pass_record
