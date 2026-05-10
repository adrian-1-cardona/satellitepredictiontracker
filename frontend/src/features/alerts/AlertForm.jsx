import { BellPlus } from "lucide-react";
import { useState } from "react";
import { getErrorMessage } from "../../api/client.js";

const initialForm = {
  satellite_name: "",
  min_elevation: 10,
  max_brightness: "",
  notification_method: "email",
};

export default function AlertForm({ locationId, onCreate }) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const payload = {
      location_id: Number(locationId),
      satellite_name: form.satellite_name.trim() || null,
      min_elevation: Number(form.min_elevation),
      max_brightness:
        form.max_brightness === "" ? null : Number(form.max_brightness),
      notification_method: form.notification_method,
    };

    try {
      await onCreate(payload);
      setForm(initialForm);
      setSuccess("Alert created.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to create alert."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="stacked-form" onSubmit={handleSubmit}>
      <div className="section-heading compact">
        <div>
          <h2>Create Alert</h2>
          <p>Notify when future passes match these thresholds.</p>
        </div>
      </div>

      {error && <div className="message error">{error}</div>}
      {success && <div className="message success">{success}</div>}

      <label>
        <span>Satellite Name</span>
        <input
          name="satellite_name"
          onChange={handleChange}
          placeholder="Optional, for example ISS (ZARYA)"
          type="text"
          value={form.satellite_name}
        />
      </label>

      <div className="form-grid two">
        <label>
          <span>Minimum Elevation</span>
          <input
            max="90"
            min="0"
            name="min_elevation"
            onChange={handleChange}
            required
            step="1"
            type="number"
            value={form.min_elevation}
          />
        </label>

        <label>
          <span>Max Brightness</span>
          <input
            max="20"
            min="-10"
            name="max_brightness"
            onChange={handleChange}
            placeholder="Optional"
            step="0.1"
            type="number"
            value={form.max_brightness}
          />
        </label>
      </div>

      <label>
        <span>Notification Method</span>
        <select
          name="notification_method"
          onChange={handleChange}
          value={form.notification_method}
        >
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="push">Push</option>
          <option value="webhook">Webhook</option>
        </select>
      </label>

      <button className="primary-button" disabled={loading} type="submit">
        <BellPlus size={18} aria-hidden="true" />
        <span>{loading ? "Creating..." : "Create Alert"}</span>
      </button>
    </form>
  );
}
