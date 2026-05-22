from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.auth import require_admin
from app.database import get_db
from app.middleware import limiter
from app.models import Alert, JobHistory, Location, SatellitePass, User
from app.pagination import PaginatedResponse, PaginationParams, paginate, pagination_params
from app.schemas import JobStatusOut, MessageOut, UserOut
from app.tasks import cleanup_expired_passes


router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats")
@limiter.limit("50/minute")
def admin_stats(request: Request, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> dict:
    return {
        "users": db.query(User).count(),
        "locations": db.query(Location).count(),
        "passes": db.query(SatellitePass).count(),
        "alerts": db.query(Alert).count(),
        "upcoming_passes": db.query(SatellitePass).filter(SatellitePass.rise_time >= datetime.now(timezone.utc)).count(),
    }


@router.get("/job-status", response_model=PaginatedResponse[JobStatusOut])
@limiter.limit("50/minute")
def job_status(
    request: Request,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    page: PaginationParams = Depends(pagination_params),
) -> dict:
    jobs = (
        db.query(JobHistory)
        .order_by(JobHistory.created_at.desc())
        .offset(page.skip)
        .limit(page.limit)
        .all()
    )
    return paginate(jobs, page)


@router.get("/job-status/{task_id}", response_model=JobStatusOut)
@limiter.limit("50/minute")
def get_job_status(
    request: Request,
    task_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> JobHistory:
    job = db.query(JobHistory).filter(JobHistory.task_id == task_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


@router.get("/users", response_model=PaginatedResponse[UserOut])
@limiter.limit("50/minute")
def users(
    request: Request,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
    page: PaginationParams = Depends(pagination_params),
) -> dict:
    users_page = db.query(User).order_by(User.created_at.desc()).offset(page.skip).limit(page.limit).all()
    return paginate(users_page, page)


@router.patch("/users/{user_id}/active", response_model=UserOut)
@limiter.limit("50/minute")
def set_user_active(
    request: Request,
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
@limiter.limit("50/minute")
def cleanup(request: Request, _: User = Depends(require_admin)) -> dict:
    result = cleanup_expired_passes.delay()
    return {"message": f"Cleanup queued: {result.id}"}
