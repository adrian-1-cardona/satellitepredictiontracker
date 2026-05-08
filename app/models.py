from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    locations: Mapped[list["Location"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    alerts: Mapped[list["Alert"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    api_keys: Mapped[list["ApiKey"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    user: Mapped[User] = relationship(back_populates="refresh_tokens")


class Location(Base):
    __tablename__ = "locations"
    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_locations_user_name"),
        Index("idx_locations_user_id", "user_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    elevation_m: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    user: Mapped[User] = relationship(back_populates="locations")
    passes: Mapped[list["SatellitePass"]] = relationship(back_populates="location", cascade="all, delete-orphan")
    alerts: Mapped[list["Alert"]] = relationship(back_populates="location", cascade="all, delete-orphan")


class SatellitePass(Base):
    __tablename__ = "passes"
    __table_args__ = (
        UniqueConstraint("location_id", "satellite_name", "rise_time", name="uq_passes_location_satellite_rise"),
        Index("idx_passes_location_id", "location_id"),
        Index("idx_passes_rise_time", "rise_time"),
        Index("idx_passes_satellite_name", "satellite_name"),
        Index("idx_passes_location_rise", "location_id", "rise_time"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id", ondelete="CASCADE"), nullable=False)
    satellite_name: Mapped[str] = mapped_column(String(160), nullable=False)
    rise_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    culmination_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    set_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    max_elevation: Mapped[float] = mapped_column(Float, nullable=False)
    brightness: Mapped[float | None] = mapped_column(Float)
    pass_quality: Mapped[str] = mapped_column(String(32), default="fair", nullable=False)
    predicted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    location: Mapped[Location] = relationship(back_populates="passes")
    alert_history: Mapped[list["AlertHistory"]] = relationship(back_populates="pass_record", cascade="all, delete-orphan")


class Alert(Base):
    __tablename__ = "alerts"
    __table_args__ = (
        Index("idx_alerts_user_id", "user_id"),
        Index("idx_alerts_location_id", "location_id"),
        Index("idx_alerts_enabled", "enabled"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id", ondelete="CASCADE"), nullable=False)
    satellite_name: Mapped[str | None] = mapped_column(String(160))
    min_elevation: Mapped[float] = mapped_column(Float, default=10.0, nullable=False)
    max_brightness: Mapped[float | None] = mapped_column(Float)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notification_method: Mapped[str] = mapped_column(String(32), default="email", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    user: Mapped[User] = relationship(back_populates="alerts")
    location: Mapped[Location] = relationship(back_populates="alerts")
    history: Mapped[list["AlertHistory"]] = relationship(back_populates="alert", cascade="all, delete-orphan")


class AlertHistory(Base):
    __tablename__ = "alert_history"
    __table_args__ = (
        Index("idx_alert_history_alert_id", "alert_id"),
        Index("idx_alert_history_delivered_at", "delivered_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    alert_id: Mapped[int] = mapped_column(ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False)
    pass_id: Mapped[int] = mapped_column(ForeignKey("passes.id", ondelete="CASCADE"), nullable=False)
    delivered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    delivery_status: Mapped[str] = mapped_column(String(32), default="sent", nullable=False)
    message: Mapped[str | None] = mapped_column(Text)

    alert: Mapped[Alert] = relationship(back_populates="history")
    pass_record: Mapped[SatellitePass] = relationship(back_populates="alert_history")


class ApiKey(Base):
    __tablename__ = "api_keys"
    __table_args__ = (Index("idx_api_keys_user_id", "user_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    key_hash: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates="api_keys")


class JobHistory(Base):
    __tablename__ = "job_history"
    __table_args__ = (
        Index("idx_job_history_task_id", "task_id"),
        Index("idx_job_history_status", "status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    task_id: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    job_type: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="queued", nullable=False)
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    result: Mapped[str | None] = mapped_column(Text)
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

