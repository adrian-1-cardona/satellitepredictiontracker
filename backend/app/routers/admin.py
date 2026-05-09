from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import require_admin
from app.database import get_db
from app.models import Alert, JobHistory, Location, SatellitePass, User
from app.schemas import JobStatusOut, MessageOut, UserOut
from app.tasks import cleanup_expired_passes


router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats")
def admin_stats(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> dict:
    return {
        "users": db.query(User).count(),
        "locations": db.query(Location).count(),
        "passes": db.query(SatellitePass).count(),
        "alerts": db.query(Alert).count(),
        "upcoming_passes": db.query(SatellitePass).filter(SatellitePass.rise_time >= datetime.now(timezone.utc)).count(),
    }


@router.get("/job-status", response_model=list[JobStatusOut])
def job_status(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    limit: int = Query(50, ge=1, le=500),
) -> list[JobHistory]:
    return db.query(JobHistory).order_by(JobHistory.created_at.desc()).limit(limit).all()


@router.get("/job-status/{task_id}", response_model=JobStatusOut)
def get_job_status(
    task_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> JobHistory:
    job = db.query(JobHistory).filter(JobHistory.task_id == task_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


@router.get("/users", response_model=list[UserOut])
def users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    limit: int = Query(100, ge=1, le=500),
) -> list[User]:
    return db.query(User).order_by(User.created_at.desc()).limit(limit).all()


@router.patch("/users/{user_id}/active", response_model=UserOut)
def set_user_active(
    user_id: int,
    active: bool,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> User:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_active = active
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/cleanup", response_model=MessageOut)
def cleanup(_: User = Depends(require_admin)) -> dict:
    result = cleanup_expired_passes.delay()
    return {"message": f"Cleanup queued: {result.id}"}

