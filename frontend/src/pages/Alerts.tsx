import { Bell, BellOff, History, Loader2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  deleteAlert,
  fetchAlertHistory,
  fetchAlerts,
  fetchLocations,
  getErrorMessage,
  updateAlert,
} from "../api/client.js";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : dateFormatter.format(date);
}

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [locations, setLocations] = useState([]);
  const [historyDays, setHistoryDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");

  const locationLookup = useMemo(
    () => new Map(locations.map((location) => [Number(location.id), location.name])),
    [locations],
  );

  const enabledCount = alerts.filter((alert) => alert.enabled).length;

  async function loadAlerts() {
    setLoading(true);
    setError("");
    try {
      const [alertsData, historyData, locationsData] = await Promise.all([
        fetchAlerts(),
        fetchAlertHistory(historyDays),
        fetchLocations(),
      ]);
      setAlerts(alertsData.data);
      setHistory(historyData.data);
      setLocations(locationsData.data);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load alerts."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAlerts();
  }, [historyDays]);

  async function handleToggle(alert) {
    setSavingId(alert.id);
    setError("");
    try {
      const updated = await updateAlert(alert.id, { enabled: !alert.enabled });
      setAlerts((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update alert."));
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(alertId) {
    setSavingId(alertId);
    setError("");
    try {
      await deleteAlert(alertId);
      setAlerts((current) => current.filter((alert) => alert.id !== alertId));
    } catch (err) {
      setError(getErrorMessage(err, "Unable to delete alert."));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="page-shell">
      <section className="section-heading">
        <div>
          <p className="eyebrow">Notifications</p>
          <h1>Alerts</h1>
          <p>Review active alert rules and recent delivery history.</p>
        </div>
      </section>

      {error && <div className="message error">{error}</div>}

      <div className="stats-grid">
        <article className="stat-tile">
          <span>Total Alerts</span>
          <strong>{alerts.length}</strong>
        </article>
        <article className="stat-tile">
          <span>Enabled</span>
          <strong>{enabledCount}</strong>
        </article>
        <article className="stat-tile">
          <span>History Window</span>
          <strong>{historyDays} days</strong>
        </article>
      </div>

      <div className="detail-grid">
        <section className="content-panel wide">
          <div className="section-heading compact">
            <div>
              <h2>Active Alerts</h2>
              <p>Enable, pause, or remove rules.</p>
            </div>
            <Bell size={20} aria-hidden="true" />
          </div>

          {loading ? (
            <div className="empty-state">Loading alerts...</div>
          ) : alerts.length ? (
            <div className="alert-list">
              {alerts.map((alert) => (
                <article className="alert-row" key={alert.id}>
                  <div>
                    <strong>{alert.satellite_name || "Any satellite"}</strong>
                    <small>
                      {locationLookup.get(Number(alert.location_id)) || `Location #${alert.location_id}`} /
                      {" "}min {Number(alert.min_elevation).toFixed(0)} deg /
                      {" "}{alert.max_brightness === null ? "any brightness" : `brightness <= ${alert.max_brightness}`}
                    </small>
                  </div>
                  <span className={`status-pill ${alert.enabled ? "enabled" : "paused"}`}>
                    {alert.enabled ? "Enabled" : "Paused"}
                  </span>
                  <div className="row-actions">
                    <button
                      className="icon-button"
                      disabled={savingId === alert.id}
                      onClick={() => handleToggle(alert)}
                      title={alert.enabled ? "Pause alert" : "Enable alert"}
                      type="button"
                    >
                      {savingId === alert.id ? (
                        <Loader2 size={18} className="spin" aria-hidden="true" />
                      ) : alert.enabled ? (
                        <BellOff size={18} aria-hidden="true" />
                      ) : (
                        <Bell size={18} aria-hidden="true" />
                      )}
                    </button>
                    <button
                      className="icon-button danger"
                      disabled={savingId === alert.id}
                      onClick={() => handleDelete(alert.id)}
                      title="Delete alert"
                      type="button"
                    >
                      <Trash2 size={18} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <BellOff size={24} aria-hidden="true" />
              <p>No alerts yet. Create one from a location detail page.</p>
            </div>
          )}
        </section>

        <section className="content-panel">
          <div className="section-heading compact">
            <div>
              <h2>Alert History</h2>
              <p>Recent deliveries from the past {historyDays} days.</p>
            </div>
            <History size={20} aria-hidden="true" />
          </div>

          <label className="history-filter">
            <span>Days</span>
            <input
              max="90"
              min="1"
              onChange={(event) => setHistoryDays(Number(event.target.value))}
              type="number"
              value={historyDays}
            />
          </label>

          {loading ? (
            <div className="empty-state">Loading history...</div>
          ) : history.length ? (
            <div className="history-list">
              {history.map((item) => (
                <article className="history-row" key={item.id}>
                  <strong>{item.delivery_status}</strong>
                  <small>{formatDate(item.delivered_at)}</small>
                  <p>{item.message || `Alert #${item.alert_id} for pass #${item.pass_id}`}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">No alert deliveries in this window.</div>
          )}
        </section>
      </div>
    </div>
  );
}
