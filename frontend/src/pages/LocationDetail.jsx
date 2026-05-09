import { ArrowLeft, Loader2, RefreshCcw, SatelliteDish } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  createAlert,
  fetchLocation,
  fetchPasses,
  getErrorMessage,
  refreshPasses,
} from "../api/client.js";
import AlertForm from "../components/AlertForm.jsx";
import PassList from "../components/PassList.jsx";

function formatCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(5) : "Unknown";
}

function nextPassLabel(passes) {
  if (!passes.length) {
    return "No pass scheduled";
  }
  const date = new Date(passes[0].rise_time);
  return Number.isNaN(date.getTime())
    ? "Upcoming pass"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function LocationDetail() {
  const { locationId } = useParams();
  const [location, setLocation] = useState(null);
  const [passes, setPasses] = useState([]);
  const [daysAhead, setDaysAhead] = useState(12);
  const [minElevation, setMinElevation] = useState("");
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingPasses, setLoadingPasses] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const bestPass = useMemo(
    () =>
      passes.reduce((best, current) => {
        if (!best || Number(current.max_elevation) > Number(best.max_elevation)) {
          return current;
        }
        return best;
      }, null),
    [passes],
  );

  async function loadLocation() {
    setLoadingLocation(true);
    setError("");
    try {
      const data = await fetchLocation(locationId);
      setLocation(data);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load location."));
    } finally {
      setLoadingLocation(false);
    }
  }

  async function loadPasses() {
    setLoadingPasses(true);
    setError("");
    try {
      const data = await fetchPasses({
        locationId,
        daysAhead,
        minElevation,
      });
      setPasses(data);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load passes."));
    } finally {
      setLoadingPasses(false);
    }
  }

  useEffect(() => {
    loadLocation();
  }, [locationId]);

  useEffect(() => {
    loadPasses();
  }, [locationId, daysAhead, minElevation]);

  async function handleRefresh() {
    setRefreshing(true);
    setNotice("");
    setError("");
    try {
      const response = await refreshPasses(locationId, daysAhead);
      setNotice(response.message || "Pass refresh queued.");
      await loadPasses();
    } catch (err) {
      setError(getErrorMessage(err, "Unable to refresh passes."));
    } finally {
      setRefreshing(false);
    }
  }

  async function handleCreateAlert(payload) {
    await createAlert(payload);
  }

  return (
    <div className="page-shell">
      <Link className="back-link" to="/dashboard">
        <ArrowLeft size={17} aria-hidden="true" />
        <span>Dashboard</span>
      </Link>

      <section className="section-heading">
        <div>
          <p className="eyebrow">Location Detail</p>
          <h1>{loadingLocation ? "Loading location..." : location?.name || "Location"}</h1>
          <p>
            {location
              ? `${formatCoordinate(location.latitude)} lat / ${formatCoordinate(location.longitude)} lon / ${Number(location.elevation_m || 0).toFixed(0)} m`
              : "Satellite pass predictions for a saved observing site."}
          </p>
        </div>
        <button className="secondary-button" disabled={refreshing} onClick={handleRefresh} type="button">
          {refreshing ? <Loader2 size={18} className="spin" aria-hidden="true" /> : <RefreshCcw size={18} aria-hidden="true" />}
          <span>{refreshing ? "Refreshing..." : "Refresh Passes"}</span>
        </button>
      </section>

      {error && <div className="message error">{error}</div>}
      {notice && <div className="message success">{notice}</div>}

      <div className="stats-grid">
        <article className="stat-tile">
          <span>Upcoming Passes</span>
          <strong>{passes.length}</strong>
        </article>
        <article className="stat-tile">
          <span>Next Rise</span>
          <strong>{nextPassLabel(passes)}</strong>
        </article>
        <article className="stat-tile">
          <span>Best Elevation</span>
          <strong>{bestPass ? `${Number(bestPass.max_elevation).toFixed(1)} deg` : "N/A"}</strong>
        </article>
      </div>

      <div className="detail-grid">
        <section className="content-panel wide">
          <div className="section-heading compact">
            <div>
              <h2>Satellite Passes</h2>
              <p>Rise, peak, set, elevation, brightness, and quality.</p>
            </div>
            <SatelliteDish size={20} aria-hidden="true" />
          </div>

          <div className="filters-row">
            <label>
              <span>Days Ahead</span>
              <input
                max="30"
                min="1"
                onChange={(event) => setDaysAhead(Number(event.target.value))}
                step="1"
                type="number"
                value={daysAhead}
              />
            </label>
            <label>
              <span>Min Elevation</span>
              <input
                max="90"
                min="0"
                onChange={(event) => setMinElevation(event.target.value)}
                placeholder="Any"
                step="1"
                type="number"
                value={minElevation}
              />
            </label>
          </div>

          <PassList loading={loadingPasses} passes={passes} />
        </section>

        <aside className="content-panel">
          <AlertForm locationId={locationId} onCreate={handleCreateAlert} />
        </aside>
      </div>
    </div>
  );
}
