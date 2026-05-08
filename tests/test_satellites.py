from datetime import datetime, timezone

import pytest

from app.errors import InvalidLocationError
from app.satellites import FALLBACK_TLE, estimate_brightness, parse_tle, pass_quality, predict_passes


def test_parse_tle_records() -> None:
    records = parse_tle(FALLBACK_TLE)
    assert len(records) == 1
    assert records[0].name == "ISS (ZARYA)"
    assert records[0].line1.startswith("1 25544U")
    assert records[0].line2.startswith("2 25544")


def test_invalid_coordinates_raise() -> None:
    with pytest.raises(InvalidLocationError):
        predict_passes(latitude=91, longitude=0, satellites=parse_tle(FALLBACK_TLE), days_ahead=1)


def test_brightness_and_quality_are_monotonic() -> None:
    high_pass = estimate_brightness(max_elevation=80, distance_km=420)
    low_pass = estimate_brightness(max_elevation=20, distance_km=420)
    assert high_pass < low_pass
    assert pass_quality(70, high_pass) == "excellent"
    assert pass_quality(40, low_pass) == "good"
    assert pass_quality(20, low_pass) == "fair"


def test_predict_iss_passes_fixed_date() -> None:
    passes = predict_passes(
        latitude=40.7128,
        longitude=-74.0060,
        elevation_m=10,
        days_ahead=12,
        start_time=datetime(2024, 1, 1, tzinfo=timezone.utc),
        satellites=parse_tle(FALLBACK_TLE),
    )
    assert passes
    assert all(item.satellite_name == "ISS (ZARYA)" for item in passes)
    assert all(item.rise_time < item.culmination_time < item.set_time for item in passes)
    assert all(item.max_elevation >= 10 for item in passes)

