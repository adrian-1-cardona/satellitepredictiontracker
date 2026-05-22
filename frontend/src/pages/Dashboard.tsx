import { Loader2, Navigation } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  createLocation,
  fetchLocations,
  getErrorMessage,
} from "../api/client.js";
import LocationList from "../features/locations/LocationList.jsx";
import Map from "../features/locations/LocationMap.jsx";
import SpaceLayout from "../layouts/SpaceLayout.jsx";

const initialLocationForm = {
  name: "",
  latitude: "",
  longitude: "",
  elevation_m: 0,
};

function normalizeDraftLocation(draft) {
  if (!draft) return null;
  return {
    name: draft.name || "Draft Location",
    latitude: Number(draft.latitude) || 0,
    longitude: Number(draft.longitude) || 0,
    elevation_m: Number(draft.elevation_m) || 0,
  };
}

export default function Dashboard() {
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [draftLocation, setDraftLocation] = useState(null);
  const [focusLocation, setFocusLocation] = useState(null);
  const [draftForm, setDraftForm] = useState(initialLocationForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedLocation = useMemo(
    () => locations.find((location) => Number(location.id) === Number(selectedLocationId)),
    [locations, selectedLocationId],
  );

  async function loadLocations() {
    setLoading(true);
    setError("");
    try {
      const envelope = await fetchLocations();
      const data = envelope.data;
      setLocations(data);
      if (data.length && !selectedLocationId) {
        setSelectedLocationId(data[0].id);
        setFocusLocation(data[0]);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load locations"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLocations();
  }, []);

  const handleMapClick = useCallback((coordinates) => {
    setDraftLocation(normalizeDraftLocation(coordinates));
    setDraftForm({
      name: "",
      latitude: coordinates.latitude?.toString() || "",
      longitude: coordinates.longitude?.toString() || "",
      elevation_m: coordinates.elevation_m || 0,
    });
    setFocusLocation(coordinates);
    setNotice(`Coordinates selected: ${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`);
  }, []);

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported by your browser");
      return;
    }

    setNotice("Getting your location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const coordinates = { latitude, longitude, elevation_m: 0 };
        handleMapClick(coordinates);
        setNotice(`Location found (±${Math.round(accuracy)}m) - click to add as location`);
      },
      (error) => {
        const messages = {
          1: "Location permission denied",
          2: "Location unavailable",
          3: "Location request timed out",
        };
        setError(messages[error.code] || "Failed to get location");
        setNotice("");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  }, [handleMapClick]);

  function handleFieldChange(event) {
    const { name, value } = event.target;
    setDraftForm((current) => ({ ...current, [name]: value }));
  }

  async function handleCreateLocation(event) {
    event.preventDefault();
    if (!draftForm.name.trim()) {
      setError("Location name is required");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        name: draftForm.name.trim(),
        latitude: Number(draftForm.latitude),
        longitude: Number(draftForm.longitude),
        elevation_m: Number(draftForm.elevation_m),
      };
      const newLocation = await createLocation(payload);
      setLocations((current) => [...current, newLocation]);
      setSelectedLocationId(newLocation.id);
      setFocusLocation(newLocation);
      setDraftLocation(null);
      setDraftForm(initialLocationForm);
      setNotice(`Location "${newLocation.name}" created`);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create location"));
    } finally {
      setSaving(false);
    }
  }

  function handleSelectLocation(locationId) {
    const location = locations.find((loc) => Number(loc.id) === Number(locationId));
    if (location) {
      setSelectedLocationId(location.id);
      setFocusLocation(location);
      setDraftLocation(null);
      setDraftForm(initialLocationForm);
    }
  }

  return (
    <SpaceLayout densityVariant="dense">
      <div className="orbit-dashboard">
        <div className="earth-stage">
          {loading ? (
            <div className="earth-loading">
              <Loader2 size={42} className="spin" aria-hidden="true" />
              <span>Loading locations...</span>
            </div>
          ) : (
            <Map
              locations={locations}
              selectedLocationId={selectedLocation?.id}
              draftLocation={draftLocation}
              focusLocation={focusLocation}
              onMapClick={handleMapClick}
            />
          )}
          <span className="orbit-line one" />
          <span className="orbit-line two" />
          <span className="orbit-node one" />
          <span className="orbit-node two" />
        </div>

        <aside className="control-panel">
          {error && <div className="message error">{error}</div>}
          {notice && <div className="message info">{notice}</div>}

          <section className="panel-section">
            <div className="section-heading compact">
              <div>
                <h2>Saved Locations</h2>
                <p>{locations.length} location{locations.length !== 1 ? "s" : ""} saved</p>
              </div>
            </div>
            <LocationList
              locations={locations}
              loading={false}
              selectedLocationId={selectedLocationId}
              onSelect={handleSelectLocation}
            />
          </section>

          {selectedLocation && (
            <section className="panel-section">
              <div className="section-heading compact">
                <div>
                  <h2>{selectedLocation.name}</h2>
                  <p>
                    {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
                  </p>
                </div>
              </div>
              <div className="location-details">
                <div>
                  <span>Elevation</span>
                  <strong>{selectedLocation.elevation_m || 0}m</strong>
                </div>
              </div>
              <Link className="full-button" to={`/locations/${selectedLocation.id}`}>
                View Passes & Alerts
              </Link>
            </section>
          )}

          <section className="panel-section">
            <div className="section-heading compact">
              <div>
                <h2>Add Location</h2>
                <p>Click the globe, use "Locate Me", or enter coordinates</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLocateMe}
              className="primary-button"
              style={{ marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            >
              <Navigation size={18} />
              Locate Me
            </button>

            <form className="stacked-form" onSubmit={handleCreateLocation}>
              <label>
                <span>Name</span>
                <input
                  maxLength="120"
                  name="name"
                  onChange={handleFieldChange}
                  placeholder="Observatory, campsite, etc."
                  required
                  value={draftForm.name}
                />
              </label>

              <div className="form-grid two">
                <label>
                  <span>Latitude</span>
                  <input
                    max="90"
                    min="-90"
                    name="latitude"
                    onChange={handleFieldChange}
                    placeholder="-90 to 90"
                    step="0.0001"
                    type="number"
                    value={draftForm.latitude}
                  />
                </label>
                <label>
                  <span>Longitude</span>
                  <input
                    max="180"
                    min="-180"
                    name="longitude"
                    onChange={handleFieldChange}
                    placeholder="-180 to 180"
                    step="0.0001"
                    type="number"
                    value={draftForm.longitude}
                  />
                </label>
              </div>

              <label>
                <span>Elevation (m)</span>
                <input
                  min="0"
                  name="elevation_m"
                  onChange={handleFieldChange}
                  placeholder="Sea level: 0"
                  step="1"
                  type="number"
                  value={draftForm.elevation_m}
                />
              </label>

              <button className="primary-button" disabled={saving} type="submit">
                {saving ? "Creating..." : "Create Location"}
              </button>
            </form>
          </section>
        </aside>
      </div>
    </SpaceLayout>
  );
}
