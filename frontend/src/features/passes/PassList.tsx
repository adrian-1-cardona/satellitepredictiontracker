import { Clock, Telescope } from "lucide-react";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : dateFormatter.format(date);
}

function formatNumber(value, suffix = "") {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(1)}${suffix}` : "Unknown";
}

function brightness(value) {
  return value === null || value === undefined ? "N/A" : formatNumber(value);
}

export default function PassList({ passes, loading }) {
  if (loading) {
    return <div className="empty-state">Loading satellite passes...</div>;
  }

  if (!passes.length) {
    return (
      <div className="empty-state">
        <Telescope size={25} aria-hidden="true" />
        <p>No upcoming passes are available for the selected filters yet.</p>
      </div>
    );
  }

  return (
    <div className="pass-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Satellite</th>
            <th>Rise</th>
            <th>Peak</th>
            <th>Set</th>
            <th>Max Elevation</th>
            <th>Brightness</th>
            <th>Quality</th>
          </tr>
        </thead>
        <tbody>
          {passes.map((satellitePass) => (
            <tr key={satellitePass.id}>
              <td>
                <div className="table-title">
                  <Clock size={16} aria-hidden="true" />
                  <span>{satellitePass.satellite_name}</span>
                </div>
              </td>
              <td>{formatDate(satellitePass.rise_time)}</td>
              <td>{formatDate(satellitePass.culmination_time)}</td>
              <td>{formatDate(satellitePass.set_time)}</td>
              <td>{formatNumber(satellitePass.max_elevation, " deg")}</td>
              <td>{brightness(satellitePass.brightness)}</td>
              <td>
                <span className={`quality-badge ${satellitePass.pass_quality || "unknown"}`}>
                  {satellitePass.pass_quality || "unknown"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
