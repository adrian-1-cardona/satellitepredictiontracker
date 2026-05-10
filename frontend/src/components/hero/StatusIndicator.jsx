import { useEffect, useState } from "react";
import { RadioTower } from "lucide-react";
import { api } from "../../api/client.js";
import "./StatusIndicator.css";

function label(status) {
  if (status === "online") return "Online";
  if (status === "offline") return "Offline";
  return "Checking\u2026";
}

export default function StatusIndicator() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function probe() {
      try {
        await api.head("/", { signal: controller.signal, timeout: 2500 });
        if (!cancelled) setStatus("online");
      } catch (err) {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        if (err?.response) {
          if (!cancelled) setStatus("online");
        } else if (!cancelled) {
          setStatus("offline");
        }
      }
    }

    probe();
    const id = window.setInterval(probe, 30_000);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="status-indicator" role="status" aria-live="polite">
      <span className="status-label">
        <RadioTower size={14} aria-hidden="true" />
        Prediction service
      </span>
      <strong className={`status-value status-${status}`}>{label(status)}</strong>
    </div>
  );
}
