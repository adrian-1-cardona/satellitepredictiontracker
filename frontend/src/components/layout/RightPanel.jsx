import { Crosshair, Loader2, LocateFixed, MapPin, Plus, Ruler } from "lucide-react";
import GlassCard from "../ui/GlassCard.jsx";

function formatCoordinate(value, axis) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return "Pending";
  }

  const suffix = axis === "lat" ? (number >= 0 ? "N" : "S") : number >= 0 ? "E" : "W";
  return `${Math.abs(number).toFixed(4)} ${suffix}`;
}

function formatElevation(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(0)} m` : "Pending";
}

export default function RightPanel({
  selectedLocation,
  draftLocation,
  saving = false,
  onFieldChange,
  onCreateLocation,
  onUseCurrentLocation,
}) {
  return (
    <aside className="sidebar-right" aria-label="Location details and controls">
      <GlassCard elevated className="panel-section location-detail-card">
        <div className="panel-heading">
          <div>
            <span className="section-title">Focused Site</span>
            <h3>{selectedLocation?.name || "No location selected"}</h3>
            <p>
              {selectedLocation
                ? "Current map focus and pass prediction source."
                : "Choose a saved location or place a new draft on the globe."}
            </p>
          </div>
          <Crosshair size={19} aria-hidden="true" />
        </div>

        <div className="metric-row">
          <div className="metric-item">
            <span className="metric-label">Latitude</span>
            <strong className="metric-value">
              {formatCoordinate(selectedLocation?.latitude, "lat")}
            </strong>
          </div>
          <div className="metric-item">
            <span className="metric-label">Longitude</span>
            <strong className="metric-value">
              {formatCoordinate(selectedLocation?.longitude, "lon")}
            </strong>
          </div>
        </div>

        <div className="metric-row">
          <div className="metric-item">
            <span className="metric-label">Elevation</span>
            <strong className="metric-value">{formatElevation(selectedLocation?.elevation_m)}</strong>
          </div>
          <div className="metric-item">
            <span className="metric-label">Site ID</span>
            <strong className="metric-value">{selectedLocation?.id || "N/A"}</strong>
          </div>
        </div>

        <div className="orbital-indicator" aria-hidden="true">
          <svg viewBox="0 0 120 120" role="img">
            <circle cx="60" cy="60" r="42" />
            <circle cx="60" cy="60" r="28" />
            <circle cx="60" cy="60" r="12" />
            <g className="orbiting-dot">
              <circle cx="60" cy="18" r="5" />
            </g>
            <circle className="orbital-core" cx="60" cy="60" r="4" />
          </svg>
        </div>
      </GlassCard>

      <GlassCard className="panel-section location-form-card" hoverEffect={false}>
        <div className="panel-heading">
          <div>
            <span className="section-title">New Site</span>
            <h3>Add Location</h3>
            <p>Use GPS, click the globe, or enter coordinates.</p>
          </div>
          <button
            className="icon-button"
            onClick={onUseCurrentLocation}
            title="Use my current location"
            type="button"
          >
            <LocateFixed size={18} aria-hidden="true" />
          </button>
        </div>

        <form className="stacked-form" onSubmit={onCreateLocation}>
          <label>
            <span>Name</span>
            <input
              maxLength="120"
              name="name"
              onChange={onFieldChange}
              placeholder="Backyard, observatory, campsite"
              required
              value={draftLocation.name}
            />
          </label>

          <div className="form-grid two">
            <label>
              <span>Latitude</span>
              <input
                max="90"
                min="-90"
                name="latitude"
                onChange={onFieldChange}
                placeholder="40.7128"
                required
                step="0.000001"
                type="number"
                value={draftLocation.latitude}
              />
            </label>

            <label>
              <span>Longitude</span>
              <input
                max="180"
                min="-180"
                name="longitude"
                onChange={onFieldChange}
                placeholder="-74.0060"
                required
                step="0.000001"
                type="number"
                value={draftLocation.longitude}
              />
            </label>
          </div>

          <label>
            <span>Elevation (m)</span>
            <input
              max="10000"
              min="-500"
              name="elevation_m"
              onChange={onFieldChange}
              step="1"
              type="number"
              value={draftLocation.elevation_m}
            />
          </label>

          <div className="draft-readout">
            <span>
              <MapPin size={15} aria-hidden="true" />
              {formatCoordinate(draftLocation.latitude, "lat")} /{" "}
              {formatCoordinate(draftLocation.longitude, "lon")}
            </span>
            <span>
              <Ruler size={15} aria-hidden="true" />
              {formatElevation(draftLocation.elevation_m)}
            </span>
          </div>

          <button className="primary-button" disabled={saving} type="submit">
            {saving ? (
              <Loader2 size={18} className="spin" aria-hidden="true" />
            ) : (
              <Plus size={18} aria-hidden="true" />
            )}
            <span>{saving ? "Saving..." : "Add New Location"}</span>
          </button>
        </form>
      </GlassCard>
    </aside>
  );
}
