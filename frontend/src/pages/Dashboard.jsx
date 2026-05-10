import { Crosshair, Loader2, RadioTower, Satellite, ShieldCheck, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createLocation, fetchLocations, getErrorMessage } from "../api/client.js";
import LeftSidebar from "../components/layout/LeftSidebar.jsx";
import RightPanel from "../components/layout/RightPanel.jsx";
import Map from "../components/Map.jsx";
import SpaceLayout from "../components/layouts/SpaceLayout.jsx";

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

const predictions = [
  {
    id: "starlink-6079",
    name: "Starlink-6079",
    designation: "Starlink",
    alert: "Close approach review queued",
    icon: TrendingUp,
  },
  {
    id: "jwst",
    name: "James Webb Space Telescope",
    designation: "Observatory",
    description: "Long-duration observation windows remain nominal.",
    icon: Satellite,
    severity: "success",
  },
];

const recommendations = [
  {
    id: "refresh-pass-windows",
    name: "Refresh pass windows",
    metric: "Keep predictions current",
    icon: RadioTower,
  },
  {
    id: "review-alert-rules",
    name: "Review alert rules",
    metric: "2 active monitoring checks",
    icon: ShieldCheck,
  },
];

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

  async function loadLocations(preferredLocationId = selectedLocationId) {
    setLoading(true);
    setError("");
    try {
      const data = await fetchLocations();
      setLocations(data);

      if (!data.length) {
        setSelectedLocationId(null);
        setFocusLocation(null);
        return;
      }

      const nextLocation =
        data.find((location) => Number(location.id) === Number(preferredLocationId)) || data[0];

      setSelectedLocationId(nextLocation.id);
      if (!focusLocation || Number(nextLocation.id) === Number(preferredLocationId)) {
        setFocusLocation(nextLocation);
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
      await loadLocations(created.id);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save location."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SpaceLayout densityVariant="normal">
      <motion.div
        className="dashboard-layout"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        {(error || success) && (
          <div className="dashboard-alerts">
            {error && <div className="message error" role="alert">{error}</div>}
            {success && <div className="message success" role="status">{success}</div>}
          </div>
        )}

        <LeftSidebar
          loading={loading}
          locations={locations}
          onSelectLocation={handleSelectLocation}
          predictions={predictions}
          recommendations={recommendations}
          selectedLocationId={selectedLocationId}
        />

        <section className="center-globe" aria-label="Interactive satellite tracking workspace">
          <div className="globe-panel-shell dashboard-globe-shell">
            <div className="globe-command-bar">
              <div>
                <p className="eyebrow">Observation Network</p>
                <h1>Dashboard</h1>
              </div>
              <div className="status-strip compact">
                <Crosshair size={17} aria-hidden="true" />
                <span>
                  {selectedLocation
                    ? `Focused on ${selectedLocation.name}.`
                    : "Choose or create a location to center the map."}
                </span>
              </div>
            </div>

            {loading ? (
              <div className="map-panel map-loading">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 size={46} aria-hidden="true" />
                </motion.div>
                <span>Loading saved locations...</span>
              </div>
            ) : (
              <Map
                draftLocation={draftLocation}
                focusLocation={focusLocation}
                locations={locations}
                onMapClick={handleMapClick}
                selectedLocationId={selectedLocation?.id}
              />
            )}
          </div>
        </section>

        <RightPanel
          draftLocation={draftLocation}
          onCreateLocation={handleCreateLocation}
          onFieldChange={handleFieldChange}
          onUseCurrentLocation={handleUseCurrentLocation}
          saving={saving}
          selectedLocation={selectedLocation}
        />
      </motion.div>
    </SpaceLayout>
  );
}
