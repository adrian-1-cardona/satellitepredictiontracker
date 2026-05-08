from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TokenResponse(BaseModel):
    user_id: int
    email: EmailStr
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=20)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    is_admin: bool
    is_active: bool
    created_at: datetime


class LocationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    elevation_m: float = Field(default=0.0, ge=-500, le=10000)


class LocationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    elevation_m: float | None = Field(default=None, ge=-500, le=10000)


class LocationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    latitude: float
    longitude: float
    elevation_m: float
    created_at: datetime
    updated_at: datetime


class PassOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    location_id: int
    satellite_name: str
    rise_time: datetime
    culmination_time: datetime
    set_time: datetime
    max_elevation: float
    brightness: float | None
    pass_quality: str
    predicted_at: datetime
    expires_at: datetime


class RefreshPassesRequest(BaseModel):
    location_id: int
    days_ahead: int = Field(default=12, ge=1, le=30)


class AlertCreate(BaseModel):
    location_id: int
    satellite_name: str | None = Field(default=None, max_length=160)
    min_elevation: float = Field(default=10.0, ge=0, le=90)
    max_brightness: float | None = Field(default=None, ge=-10, le=20)
    notification_method: str = Field(default="email", pattern="^(email|sms|push|webhook)$")


class AlertUpdate(BaseModel):
    satellite_name: str | None = Field(default=None, max_length=160)
    min_elevation: float | None = Field(default=None, ge=0, le=90)
    max_brightness: float | None = Field(default=None, ge=-10, le=20)
    enabled: bool | None = None
    notification_method: str | None = Field(default=None, pattern="^(email|sms|push|webhook)$")


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    location_id: int
    satellite_name: str | None
    min_elevation: float
    max_brightness: float | None
    enabled: bool
    notification_method: str
    created_at: datetime
    updated_at: datetime


class AlertHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    alert_id: int
    pass_id: int
    delivered_at: datetime
    delivery_status: str
    message: str | None


class JobStatusOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    task_id: str
    job_type: str
    status: str
    progress: int
    result: str | None
    error: str | None
    created_at: datetime
    updated_at: datetime


class MessageOut(BaseModel):
    message: str


class HealthOut(BaseModel):
    status: str
    version: str
    timestamp: datetime

