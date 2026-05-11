import { MapPin, Navigation } from "lucide-react";
import { Link } from "react-router-dom";

function coordinate(value, suffix) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(4)}${suffix}` : "Unknown";
}

export default function LocationList({
  locations,
  loading,
  selectedLocationId,
  onSelect,
}) {
  if (loading) {
    return <div className="empty-state">Loading saved locations...</div>;
  }

  if (!locations.length) {
    return (
      <div className="empty-state">
        <MapPin size={24} aria-hidden="true" />
        <p>Add a location by using your current position, clicking the globe, or entering coordinates.</p>
      </div>
    );
  }

  return (
    <div className="location-list">
      {locations.map((location) => {
        const isSelected = Number(selectedLocationId) === Number(location.id);
        return (
          <article className={`location-row ${isSelected ? "selected" : ""}`} key={location.id}>
            <button type="button" onClick={() => onSelect(location)}>
              <span className="pin-dot" aria-hidden="true" />
              <span>
                <strong>{location.name}</strong>
                <small>
                  {coordinate(location.latitude, " lat")} / {coordinate(location.longitude, " lon")}
                </small>
              </span>
            </button>
            <Link className="icon-link" to={`/locations/${location.id}`} aria-label={`Open ${location.name}`}>
              <Navigation size={17} aria-hidden="true" />
            </Link>
          </article>
        );
      })}
    </div>
  );
}
