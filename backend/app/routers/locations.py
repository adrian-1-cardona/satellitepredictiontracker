from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.middleware import limiter
from app.models import Location, User
from app.pagination import PaginatedResponse, PaginationParams, paginate, pagination_params
from app.schemas import LocationCreate, LocationOut, LocationUpdate, MessageOut
from app.tasks import enqueue_prediction


router = APIRouter(prefix="/locations", tags=["Locations"])


def owned_location(db: Session, user_id: int, location_id: int) -> Location:
    location = db.get(Location, location_id)
    if not location or location.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    return location


@router.get("", response_model=PaginatedResponse[LocationOut])
@limiter.limit("100/minute")
def list_locations(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: PaginationParams = Depends(pagination_params),
) -> dict:
    locations = (
        db.query(Location)
        .filter(Location.user_id == current_user.id)
        .order_by(Location.created_at.desc())
        .offset(page.skip)
        .limit(page.limit)
        .all()
    )
    return paginate(locations, page)


@router.post("", response_model=LocationOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("100/minute")
def create_location(
    request: Request,
    payload: LocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Location:
    location = Location(user_id=current_user.id, **payload.model_dump())
    db.add(location)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Location name already exists") from None
    db.refresh(location)
    enqueue_prediction(location.id)
    return location


@router.get("/{location_id}", response_model=LocationOut)
@limiter.limit("100/minute")
def get_location(
    request: Request,
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Location:
    return owned_location(db, current_user.id, location_id)


@router.patch("/{location_id}", response_model=LocationOut)
@limiter.limit("100/minute")
def update_location(
    request: Request,
    location_id: int,
    payload: LocationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Location:
    location = owned_location(db, current_user.id, location_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(location, field, value)
    db.add(location)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Location name already exists") from None
    db.refresh(location)
    enqueue_prediction(location.id)
    return location


@router.delete("/{location_id}", response_model=MessageOut)
@limiter.limit("100/minute")
def delete_location(
    request: Request,
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    location = owned_location(db, current_user.id, location_id)
    db.delete(location)
    db.commit()
    return {"message": "Location deleted"}
