from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import authenticate_user, consume_refresh_token, get_current_user, hash_password, issue_tokens, token_hash
from app.database import get_db
from app.middleware import limiter
from app.models import RefreshToken, User
from app.schemas import LoginRequest, MessageOut, RefreshRequest, TokenResponse, UserCreate, UserOut


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, payload: UserCreate, db: Session = Depends(get_db)) -> dict:
    user = User(email=payload.email.lower(), password_hash=hash_password(payload.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered") from None
    db.refresh(user)
    return issue_tokens(db, user)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)) -> dict:
    user = authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return issue_tokens(db, user)


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("10/minute")
def refresh(request: Request, payload: RefreshRequest, db: Session = Depends(get_db)) -> dict:
    user = consume_refresh_token(db, payload.refresh_token)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    return issue_tokens(db, user)


@router.post("/logout", response_model=MessageOut)
@limiter.limit("10/minute")
def logout(request: Request, payload: RefreshRequest, db: Session = Depends(get_db)) -> dict:
    record = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash(payload.refresh_token)).first()
    if record:
        record.revoked = True
        db.add(record)
        db.commit()
    return {"message": "Logged out"}


@router.get("/me", response_model=UserOut)
@limiter.limit("100/minute")
def me(request: Request, current_user: User = Depends(get_current_user)) -> User:
    return current_user
