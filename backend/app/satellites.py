from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests
from skyfield.api import EarthSatellite, load, wgs84

from app.config import get_settings
from app.errors import InvalidLocationError, PredictionError


FALLBACK_TLE = """ISS (ZARYA)
1 25544U 98067A   24001.00000000  .00016717  00000+0  10270-3 0  9002
2 25544  51.6426  30.1804 0005423  64.5498  52.4507 15.50008619    15
"""


@dataclass(frozen=True)
class TLERecord:
    name: str
    line1: str
    line2: str


@dataclass(frozen=True)
class PredictedPass:
    satellite_name: str
    rise_time: datetime
    culmination_time: datetime
    set_time: datetime
    max_elevation: float
    brightness: float
    pass_quality: str


def validate_location(latitude: float, longitude: float) -> None:
    if not -90 <= latitude <= 90:
        raise InvalidLocationError("Latitude must be between -90 and 90 degrees")
    if not -180 <= longitude <= 180:
        raise InvalidLocationError("Longitude must be between -180 and 180 degrees")


def parse_tle(text: str) -> list[TLERecord]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    records: list[TLERecord] = []
    i = 0
    while i < len(lines):
        if i + 2 < len(lines) and lines[i + 1].startswith("1 ") and lines[i + 2].startswith("2 "):
            records.append(TLERecord(lines[i], lines[i + 1], lines[i + 2]))
            i += 3
        elif i + 1 < len(lines) and lines[i].startswith("1 ") and lines[i + 1].startswith("2 "):
            sat_num = lines[i].split()[1]
            records.append(TLERecord(f"NORAD {sat_num}", lines[i], lines[i + 1]))
            i += 2
        else:
            i += 1
    return records


def load_tle_records(refresh: bool = False) -> list[TLERecord]:
    settings = get_settings()
    cache_path = Path(settings.tle_cache_path)

    if cache_path.exists() and not refresh:
        cached = parse_tle(cache_path.read_text())
        if cached:
            return cached

    try:
        response = requests.get(settings.tle_url, timeout=10)
        response.raise_for_status()
        records = parse_tle(response.text)
        if records:
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            cache_path.write_text(response.text)
            return records
    except requests.RequestException:
        pass

    return parse_tle(FALLBACK_TLE)


def estimate_brightness(max_elevation: float, distance_km: float) -> float:
    # Approximation for demo alert filtering: higher passes and closer range are brighter.
    magnitude = 4.5 - (max_elevation / 18.0) + max(0.0, (distance_km - 420.0) / 900.0)
    return round(magnitude, 2)


def pass_quality(max_elevation: float, brightness: float | None = None) -> str:
    if max_elevation >= 60 and (brightness is None or brightness <= 1.5):
        return "excellent"
    if max_elevation >= 35:
        return "good"
    if max_elevation >= 15:
        return "fair"
    return "poor"


def predict_passes(
    latitude: float,
    longitude: float,
    elevation_m: float = 0.0,
    days_ahead: int = 12,
    min_elevation: float | None = None,
    start_time: datetime | None = None,
    satellites: list[TLERecord] | None = None,
) -> list[PredictedPass]:
    validate_location(latitude, longitude)
    settings = get_settings()
    threshold = min_elevation if min_elevation is not None else settings.min_pass_elevation
    start = start_time or datetime.now(timezone.utc)
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    end = start + timedelta(days=days_ahead)

    records = satellites if satellites is not None else load_tle_records()
    if not records:
        raise PredictionError("No TLE records available")

    ts = load.timescale()
    observer = wgs84.latlon(latitude_degrees=latitude, longitude_degrees=longitude, elevation_m=elevation_m)
    t0 = ts.from_datetime(start)
    t1 = ts.from_datetime(end)
    predictions: list[PredictedPass] = []

    for record in records:
        try:
            satellite = EarthSatellite(record.line1, record.line2, record.name, ts)
            event_times, events = satellite.find_events(observer, t0, t1, altitude_degrees=threshold)
        except Exception:
            continue

        open_rise = None
        open_culmination = None
        for event_time, event in zip(event_times, events, strict=False):
            if event == 0:
                open_rise = event_time
                open_culmination = None
            elif event == 1 and open_rise is not None:
                open_culmination = event_time
            elif event == 2 and open_rise is not None and open_culmination is not None:
                rise_dt = open_rise.utc_datetime()
                culmination_dt = open_culmination.utc_datetime()
                set_dt = event_time.utc_datetime()
                topocentric = (satellite - observer).at(open_culmination)
                altitude, _, distance = topocentric.altaz()
                max_elevation = round(float(altitude.degrees), 2)
                brightness = estimate_brightness(max_elevation, float(distance.km))
                predictions.append(
                    PredictedPass(
                        satellite_name=record.name,
                        rise_time=rise_dt,
                        culmination_time=culmination_dt,
                        set_time=set_dt,
                        max_elevation=max_elevation,
                        brightness=brightness,
                        pass_quality=pass_quality(max_elevation, brightness),
                    )
                )
                open_rise = None
                open_culmination = None

    predictions.sort(key=lambda item: item.rise_time)
    return predictions


def list_trackable_satellites(limit: int = 100) -> list[str]:
    return [record.name for record in load_tle_records()[:limit]]

