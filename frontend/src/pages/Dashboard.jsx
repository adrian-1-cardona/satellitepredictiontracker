import {
  AlertTriangle,
  ArrowUpRight,
  CircleHelp,
  Grid3X3,
  Loader2,
  MapPin,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchLocations } from "../api/client.js";
import Map from "../components/Map.jsx";
import SpaceLayout from "../components/layouts/SpaceLayout.jsx";

const insights = [
  {
    id: "starlink-6079",
    group: "Satellite",
    title: "Starlink-6079",
    note: "Risk of collision with newly launched Chinese satellite",
    tone: "warning",
    variant: "wide",
  },
  {
    id: "jwst",
    group: "Satellite",
    title: "James Webb Space Telescope",
    note: "Almost 4 years in operation",
    tone: "warning",
    variant: "tall",
  },
];

const recommendations = [
  {
    id: "low-propellant",
    group: "Satellite",
    title: "Starlink-6079",
    note: "Low propellant",
    tone: "info",
    variant: "angled",
  },
];

const launches = [
  { id: "falcon-jan", date: "Jan 26", title: "Spacex Falcon 9 22 Starlink", site: "Florida" },
  { id: "crew-feb", date: "Feb 15", title: "SpaceX Falcon 9 Crew-12 (to ISS)", site: "China" },
  { id: "eos-mar", date: "Mar 26", title: "Private PSLV EOS-10 Earth", site: "India" },
];

const categories = [
  { label: "Remote Sensing", value: "1200", width: "56%" },
  { label: "Communications", value: "3400", width: "80%" },
  { label: "Science / Technology", value: "550", width: "50%" },
  { label: "Navigations / GNSS", value: "120", width: "34%" },
  { label: "Others", value: "440", width: "36%" },
];

function SatelliteArt({ variant = "wide" }) {
  return (
    <svg className={`satellite-art ${variant}`} viewBox="0 0 240 150" aria-hidden="true">
      <defs>
        <linearGradient id={`panel-${variant}`} x1="0" x2="1">
          <stop offset="0" stopColor="#7296c7" />
          <stop offset="1" stopColor="#e4f8ff" />
        </linearGradient>
        <radialGradient id={`body-${variant}`} cx="45%" cy="40%" r="70%">
          <stop offset="0" stopColor="#f5efe1" />
          <stop offset="0.42" stopColor="#8794a3" />
          <stop offset="1" stopColor="#2c3441" />
        </radialGradient>
      </defs>
      <g className="satellite-art-body">
        <path d="M68 75 7 54 5 91 68 99Z" fill={`url(#panel-${variant})`} />
        <path d="M172 53 232 28 235 65 177 87Z" fill={`url(#panel-${variant})`} />
        <path d="M69 70 176 47 183 89 72 104Z" fill="#a8c7e8" opacity="0.2" />
        <path d="M78 67 161 45 174 86 91 109Z" fill={`url(#body-${variant})`} />
        <path d="M151 63c31-4 52 7 60 22-18 3-36 0-58-12Z" fill="#d8dee7" opacity="0.86" />
        <circle cx="116" cy="75" r="25" fill="#6b7280" opacity="0.38" />
        <path d="M97 54c21 3 38 17 48 41" stroke="#f8fafc" strokeWidth="2" opacity="0.52" />
        <path d="M20 59 64 74M18 75l44 12M181 57l39-16M185 75l39-14" stroke="#f6fbff" strokeWidth="1.4" opacity="0.7" />
      </g>
    </svg>
  );
}

function InsightCard({ item }) {
  return (
    <article className="orbit-satellite-card">
      <SatelliteArt variant={item.variant} />
      <button className="floating-arrow" type="button" aria-label={`Open ${item.title}`}>
        <ArrowUpRight size={24} aria-hidden="true" />
      </button>
      <div className="orbit-card-copy">
        <span>{item.group}</span>
        <strong>{item.title}</strong>
        <p className={`orbit-alert ${item.tone}`}>
          <AlertTriangle size={17} aria-hidden="true" />
          {item.note}
        </p>
      </div>
    </article>
  );
}

function RadarTile() {
  return (
    <section className="radar-tile" aria-label="Orbital scan visualization">
      <div className="radar-grid" />
      <div className="radar-dial">
        <span className="radar-sweep" />
        <span className="radar-core" />
        <span className="radar-dot one" />
        <span className="radar-dot two" />
        <span className="radar-dot three" />
      </div>
    </section>
  );
}

function EndUseCard() {
  return (
    <section className="orbital-panel category-panel">
      <div className="panel-title-row">
        <h2>Satellites by End-Use Category</h2>
        <button className="floating-arrow small" type="button" aria-label="Open category analytics">
          <ArrowUpRight size={22} aria-hidden="true" />
        </button>
      </div>
      <div className="category-list">
        {categories.map((item) => (
          <div className="category-row" key={item.label}>
            <span>{item.label}</span>
            <div className="category-meter">
              <i style={{ width: item.width }} />
            </div>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function LaunchCard() {
  return (
    <section className="orbital-panel launches-panel">
      <div className="panel-title-row">
        <h2>Upcoming Launches</h2>
        <button className="floating-arrow small" type="button" aria-label="Open upcoming launches">
          <ArrowUpRight size={22} aria-hidden="true" />
        </button>
      </div>
      <div className="launch-timeline">
        {launches.map((launch) => (
          <article className="launch-item" key={launch.id}>
            <span className="launch-date">{launch.date}</span>
            <strong>{launch.title}</strong>
            <span className="launch-site">{launch.site}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [draftLocation, setDraftLocation] = useState(null);
  const [focusLocation, setFocusLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const selectedLocation = useMemo(
    () => locations.find((location) => Number(location.id) === Number(selectedLocationId)),
    [locations, selectedLocationId],
  );

  useEffect(() => {
    let mounted = true;

    async function loadLocations() {
      setLoading(true);
      setNotice("");
      try {
        const data = await fetchLocations();
        if (!mounted) return;
        setLocations(data);
        if (data.length) {
          setSelectedLocationId(data[0].id);
          setFocusLocation(data[0]);
        }
      } catch {
        if (!mounted) return;
        setNotice("");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadLocations();
    return () => {
      mounted = false;
    };
  }, []);

  const handleMapClick = useCallback((coordinates) => {
    setDraftLocation({
      name: "Map Selection",
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      elevation_m: 0,
    });
    setFocusLocation(coordinates);
    setNotice(`Coordinates locked at ${coordinates.latitude}, ${coordinates.longitude}.`);
  }, []);

  function handleClearFocus() {
    setSelectedLocationId(null);
    setFocusLocation(null);
  }

  const detailCode = selectedLocation ? `LOC-${selectedLocation.id}` : "SAT-123";
  const selectedName = selectedLocation?.name || "Earth Observe";

  return (
    <SpaceLayout densityVariant="dense">
      <motion.div
        className="orbit-dashboard"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <aside className="ia-rail">
          <h1>IA Insights</h1>
          <section>
            <h2>Prediction</h2>
            <div className="ia-card-stack">
              {insights.map((item) => (
                <InsightCard item={item} key={item.id} />
              ))}
            </div>
          </section>
          <section>
            <h2>Recommendations</h2>
            <div className="ia-card-stack">
              {recommendations.map((item) => (
                <InsightCard item={item} key={item.id} />
              ))}
            </div>
          </section>
        </aside>

        <main className="hero-orbit" aria-label="Satellite dashboard">
          <div className="earth-stage">
            {loading ? (
              <div className="earth-loading">
                <Loader2 size={42} className="spin" aria-hidden="true" />
                <span>Calibrating orbit view</span>
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
            <span className="orbit-line one" />
            <span className="orbit-line two" />
            <span className="orbit-node one" />
            <span className="orbit-node two" />
          </div>

          <div className="hero-actions">
            {selectedLocation ? (
              <Link className="explore-button" to={`/locations/${selectedLocation.id}`}>
                Explore
              </Link>
            ) : (
              <button className="explore-button" type="button">
                Explore
              </button>
            )}
            <div className="orbit-command">
              <span className="spark-button">
                <Sparkles size={22} aria-hidden="true" />
              </span>
              <span className="command-copy">
                {notice || "Tell me what you want to know...."}
              </span>
              <button type="button" aria-label="Help">
                <CircleHelp size={22} aria-hidden="true" />
              </button>
              <button type="button" aria-label="More">
                <Grid3X3 size={21} aria-hidden="true" />
              </button>
            </div>
          </div>
        </main>

        <aside className="orbit-right-column">
          <section className="satellite-detail">
            <button className="detail-close" type="button" onClick={handleClearFocus} aria-label="Clear focus">
              <X size={30} aria-hidden="true" />
            </button>
            <p>Code</p>
            <h2>{detailCode}</h2>
            <div className="detail-grid">
              <div>
                <span>Current altitude</span>
                <strong>450KM</strong>
              </div>
              <div>
                <span>Orbital velocity</span>
                <strong>7.3/S</strong>
              </div>
              <div>
                <span>Orbital period</span>
                <strong>78min</strong>
              </div>
              <div>
                <span>Type of orbit</span>
                <strong>SSO</strong>
              </div>
            </div>
            <div className="purpose-row">
              <div>
                <span>Purpose</span>
                <strong>{selectedName}</strong>
              </div>
              <button type="button" aria-label="Add satellite">
                <Plus size={30} aria-hidden="true" />
              </button>
            </div>
          </section>

          <RadarTile />
        </aside>

        <div className="dashboard-bottom">
          <LaunchCard />
          <EndUseCard />
        </div>

        {locations.length > 0 && (
          <div className="location-strip" aria-label="Saved observing sites">
            {locations.slice(0, 3).map((location) => (
              <button
                className={Number(location.id) === Number(selectedLocationId) ? "active" : ""}
                key={location.id}
                onClick={() => {
                  setSelectedLocationId(location.id);
                  setFocusLocation(location);
                }}
                type="button"
              >
                <MapPin size={15} aria-hidden="true" />
                {location.name}
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </SpaceLayout>
  );
}
