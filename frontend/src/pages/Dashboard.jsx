import { Crosshair, Loader2, LocateFixed, MapPinned, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createLocation, fetchLocations, getErrorMessage } from "../api/client.js";
import LocationList from "../components/LocationList.jsx";
import Map from "../components/Map.jsx";

const initialLocationForm = {
  name: "",
  latitude: "",
  longitude: "",
  elevation_m: 0,
};

function normalizeDraftLocation(draft) {
  return {
    name: draft.name.trim(),
    latitude: Number(draft.latitude),
    longitude: Number(draft.longitude),
    elevation_m: Number(draft.elevation_m || 0),
  };
}

export default function Dashboard() {
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [draftLocation, setDraftLocation] = useState(initialLocationForm);
  const [focusLocation, setFocusLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedLocation = useMemo(
    () => locations.find((location) => Number(location.id) === Number(selectedLocationId)),
    [locations, selectedLocationId],
  );

  async function loadLocations() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchLocations();
      setLocations(data);
      if (data.length && !selectedLocationId) {
        setSelectedLocationId(data[0].id);
        setFocusLocation(data[0]);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load locations."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLocations();
  }, []);

  function handleFieldChange(event) {
    const { name, value } = event.target;
    setDraftLocation((current) => ({ ...current, [name]: value }));
  }

  const handleMapClick = useCallback((coordinates) => {
    setDraftLocation((current) => ({
      ...current,
      name: current.name || "Map Selection",
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    }));
    setFocusLocation(coordinates);
    setSuccess("Coordinates set from the globe.");
  }, []);

  function handleSelectLocation(location) {
    setSelectedLocationId(location.id);
    setFocusLocation(location);
  }

  function handleUseCurrentLocation() {
    setError("");
    setSuccess("");
    if (!navigator.geolocation) {
      setError("Geolocation is not available in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          name: draftLocation.name || "Current Location",
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
          elevation_m: Number(position.coords.altitude || draftLocation.elevation_m || 0),
        };
        setDraftLocation(nextLocation);
        setFocusLocation(nextLocation);
        setSuccess("Coordinates set from your browser location.");
      },
      () => {
        setError("Unable to read your current location.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function handleCreateLocation(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = normalizeDraftLocation(draftLocation);
      const created = await createLocation(payload);
      setDraftLocation(initialLocationForm);
      setSelectedLocationId(created.id);
      setFocusLocation(created);
      setSuccess(`${created.name} was saved. Pass predictions have been queued.`);
      await loadLocations();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save location."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-shell">
      <section className="section-heading">
        <div>
          <p className="eyebrow">Observation Network</p>
          <h1>Dashboard</h1>
          <p>Pin observing sites, center the globe, and open each location for pass predictions.</p>
        </div>
      </section>

      {error && <div className="message error">{error}</div>}
      {success && <div className="message success">{success}</div>}

      <div className="dashboard-grid">
        <Map
          draftLocation={draftLocation}
          focusLocation={focusLocation}
          locations={locations}
          onMapClick={handleMapClick}
          selectedLocationId={selectedLocation?.id}
        />

        <aside className="control-panel">
          <section className="panel-section">
            <div className="section-heading compact">
              <div>
                <h2>Add Location</h2>
                <p>Use GPS, click the globe, or enter coordinates.</p>
              </div>
              <button
                className="icon-button"
                onClick={handleUseCurrentLocation}
                title="Use my current location"
                type="button"
              >
                <LocateFixed size={18} aria-hidden="true" />
              </button>
            </div>

            <form className="stacked-form" onSubmit={handleCreateLocation}>
              <label>
                <span>Name</span>
                <input
                  maxLength="120"
                  name="name"
                  onChange={handleFieldChange}
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
                    onChange={handleFieldChange}
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
                    onChange={handleFieldChange}
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
                  onChange={handleFieldChange}
                  step="1"
                  type="number"
                  value={draftLocation.elevation_m}
                />
              </label>

              <button className="primary-button" disabled={saving} type="submit">
                {saving ? <Loader2 size={18} className="spin" aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
                <span>{saving ? "Saving..." : "Add New Location"}</span>
              </button>
            </form>
          </section>

          <section className="panel-section">
            <div className="section-heading compact">
              <div>
                <h2>Saved Locations</h2>
                <p>{locations.length} location{locations.length === 1 ? "" : "s"} stored.</p>
              </div>
              <MapPinned size={20} aria-hidden="true" />
            </div>
            <LocationList
              loading={loading}
              locations={locations}
              onSelect={handleSelectLocation}
              selectedLocationId={selectedLocationId}
            />
          </section>

          <section className="panel-section status-strip">
            <Crosshair size={19} aria-hidden="true" />
            <span>
              {selectedLocation
                ? `Focused on ${selectedLocation.name}.`
                : "Choose or create a location to center the map."}
            </span>
          </section>
        </aside>
      </div>
    </div>
  );
}
