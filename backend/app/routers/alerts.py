from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.middleware import limiter
from app.models import Alert, AlertHistory, Location, User
from app.pagination import PaginatedResponse, PaginationParams, paginate, pagination_params
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


@router.get("", response_model=PaginatedResponse[AlertOut])
@limiter.limit("100/minute")
def list_alerts(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: PaginationParams = Depends(pagination_params),
) -> dict:
    alerts = (
        db.query(Alert)
        .filter(Alert.user_id == current_user.id)
        .order_by(Alert.created_at.desc())
        .offset(page.skip)
        .limit(page.limit)
        .all()
    )
    return paginate(alerts, page)


@router.post("", response_model=AlertOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("100/minute")
def create_alert(
    request: Request,
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


@router.get("/history", response_model=PaginatedResponse[AlertHistoryOut])
@limiter.limit("100/minute")
def alert_history(
    request: Request,
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: PaginationParams = Depends(pagination_params),
) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    history = (
        db.query(AlertHistory)
        .join(Alert)
        .filter(Alert.user_id == current_user.id, AlertHistory.delivered_at >= since)
        .order_by(AlertHistory.delivered_at.desc())
        .offset(page.skip)
        .limit(page.limit)
        .all()
    )
    return paginate(history, page)


@router.get("/stats", response_model=dict)
@limiter.limit("100/minute")
def alert_stats(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    total = db.query(Alert).filter(Alert.user_id == current_user.id).count()
    enabled = db.query(Alert).filter(Alert.user_id == current_user.id, Alert.enabled.is_(True)).count()
    delivered = db.query(AlertHistory).join(Alert).filter(Alert.user_id == current_user.id).count()
    return {"total_alerts": total, "enabled_alerts": enabled, "delivered_alerts": delivered}


@router.get("/{alert_id}", response_model=AlertOut)
@limiter.limit("100/minute")
def get_alert(
    request: Request,
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Alert:
    return owned_alert(db, current_user.id, alert_id)


@router.patch("/{alert_id}", response_model=AlertOut)
@limiter.limit("100/minute")
def update_alert(
    request: Request,
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
@limiter.limit("100/minute")
def delete_alert(
    request: Request,
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    alert = owned_alert(db, current_user.id, alert_id)
    db.delete(alert)
    db.commit()
    return {"message": "Alert deleted"}


@router.get("/history/recent", response_model=PaginatedResponse[AlertHistoryOut], include_in_schema=False)
@limiter.limit("100/minute")
def alert_history_legacy(
    request: Request,
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: PaginationParams = Depends(pagination_params),
) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    history = (
        db.query(AlertHistory)
        .join(Alert)
        .filter(Alert.user_id == current_user.id, AlertHistory.delivered_at >= since)
        .order_by(AlertHistory.delivered_at.desc())
        .offset(page.skip)
        .limit(page.limit)
        .all()
    )
    return paginate(history, page)


@router.get("/stats/summary", include_in_schema=False)
@limiter.limit("100/minute")
def alert_stats_legacy(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    total = db.query(Alert).filter(Alert.user_id == current_user.id).count()
    enabled = db.query(Alert).filter(Alert.user_id == current_user.id, Alert.enabled.is_(True)).count()
    delivered = db.query(AlertHistory).join(Alert).filter(Alert.user_id == current_user.id).count()
    return {"total_alerts": total, "enabled_alerts": enabled, "delivered_alerts": delivered}
