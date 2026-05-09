from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Alert, AlertHistory, Location, User
from app.schemas import AlertCreate, AlertHistoryOut, AlertOut, AlertUpdate, MessageOut


router = APIRouter(prefix="/alerts", tags=["Alerts"])


def ensure_owned_location(db: Session, user_id: int, location_id: int) -> Location:
    location = db.get(Location, location_id)
    if not location or location.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    return location


def owned_alert(db: Session, user_id: int, alert_id: int) -> Alert:
    alert = db.get(Alert, alert_id)
    if not alert or alert.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    return alert


@router.get("", response_model=list[AlertOut])
def list_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Alert]:
    return db.query(Alert).filter(Alert.user_id == current_user.id).order_by(Alert.created_at.desc()).all()


@router.post("", response_model=AlertOut, status_code=status.HTTP_201_CREATED)
def create_alert(
    payload: AlertCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Alert:
    ensure_owned_location(db, current_user.id, payload.location_id)
    alert = Alert(user_id=current_user.id, **payload.model_dump())
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


@router.get("/history", response_model=list[AlertHistoryOut])
def alert_history(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AlertHistory]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    return (
        db.query(AlertHistory)
        .join(Alert)
        .filter(Alert.user_id == current_user.id, AlertHistory.delivered_at >= since)
        .order_by(AlertHistory.delivered_at.desc())
        .all()
    )


@router.get("/stats", response_model=dict)
def alert_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    total = db.query(Alert).filter(Alert.user_id == current_user.id).count()
    enabled = db.query(Alert).filter(Alert.user_id == current_user.id, Alert.enabled.is_(True)).count()
    delivered = db.query(AlertHistory).join(Alert).filter(Alert.user_id == current_user.id).count()
    return {"total_alerts": total, "enabled_alerts": enabled, "delivered_alerts": delivered}


@router.get("/{alert_id}", response_model=AlertOut)
def get_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Alert:
    return owned_alert(db, current_user.id, alert_id)


@router.patch("/{alert_id}", response_model=AlertOut)
def update_alert(
    alert_id: int,
    payload: AlertUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Alert:
    alert = owned_alert(db, current_user.id, alert_id)
    values = payload.model_dump(exclude_unset=True)
    if "location_id" in values:
        ensure_owned_location(db, current_user.id, values["location_id"])
    for field, value in values.items():
        setattr(alert, field, value)
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


@router.delete("/{alert_id}", response_model=MessageOut)
def delete_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    alert = owned_alert(db, current_user.id, alert_id)
    db.delete(alert)
    db.commit()
    return {"message": "Alert deleted"}


@router.get("/history/recent", response_model=list[AlertHistoryOut], include_in_schema=False)
def alert_history_legacy(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AlertHistory]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    return (
        db.query(AlertHistory)
        .join(Alert)
        .filter(Alert.user_id == current_user.id, AlertHistory.delivered_at >= since)
        .order_by(AlertHistory.delivered_at.desc())
        .all()
    )


@router.get("/stats/summary", include_in_schema=False)
def alert_stats_legacy(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    total = db.query(Alert).filter(Alert.user_id == current_user.id).count()
    enabled = db.query(Alert).filter(Alert.user_id == current_user.id, Alert.enabled.is_(True)).count()
    delivered = db.query(AlertHistory).join(Alert).filter(Alert.user_id == current_user.id).count()
    return {"total_alerts": total, "enabled_alerts": enabled, "delivered_alerts": delivered}
