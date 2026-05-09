from datetime import datetime, timedelta, timezone

from sqlalchemy import inspect, text

import app.database as database
from app.models import Location, SatellitePass, User


def test_expected_tables_and_indexes_exist() -> None:
    inspector = inspect(database.engine)
    expected = {
        "users",
        "refresh_tokens",
        "locations",
        "passes",
        "alerts",
        "alert_history",
        "api_keys",
        "job_history",
    }
    assert expected.issubset(set(inspector.get_table_names()))

    pass_indexes = {idx["name"] for idx in inspector.get_indexes("passes")}
    assert {"idx_passes_location_id", "idx_passes_rise_time", "idx_passes_satellite_name"}.issubset(pass_indexes)


def test_cascading_deletes() -> None:
    db = database.SessionLocal()
    try:
        user = User(email="cascade@example.com", password_hash="hash")
        db.add(user)
        db.commit()
        db.refresh(user)
        user_id = user.id

        location = Location(user_id=user_id, name="Home", latitude=1, longitude=2)
        db.add(location)
        db.commit()
        db.refresh(location)

        db.add(
            SatellitePass(
                location_id=location.id,
                satellite_name="ISS (ZARYA)",
                rise_time=datetime.now(timezone.utc),
                culmination_time=datetime.now(timezone.utc) + timedelta(minutes=5),
                set_time=datetime.now(timezone.utc) + timedelta(minutes=10),
                max_elevation=45,
                brightness=1.0,
                pass_quality="good",
                expires_at=datetime.now(timezone.utc) + timedelta(days=12),
            )
        )
        db.commit()

        db.execute(text("DELETE FROM users WHERE id = :user_id"), {"user_id": user_id})
        db.commit()

        assert db.query(Location).filter(Location.user_id == user_id).count() == 0
        assert db.query(SatellitePass).count() == 0
    finally:
        db.close()
