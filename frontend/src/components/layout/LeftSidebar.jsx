import { motion } from "framer-motion";
import { AlertCircle, MapPinned, RadioTower, Sparkles, TrendingUp } from "lucide-react";
import LocationList from "../LocationList.jsx";
import GlassCard from "../ui/GlassCard.jsx";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

function InsightCard({ item, tone = "brand" }) {
  const Icon = item.icon || TrendingUp;
  const badgeClassName = item.severity ? `card-badge ${item.severity}` : "card-badge";

  return (
    <GlassCard className="satellite-card">
      <div className="satellite-card-header">
        <div className={`satellite-card-image ${tone}`}>
          <Icon size={22} aria-hidden="true" />
        </div>
        <div className="satellite-card-copy">
          <strong className="satellite-card-title">{item.name}</strong>
          <span className="satellite-card-subtitle">{item.designation || item.metric}</span>
        </div>
      </div>

      {item.alert && (
        <span className={badgeClassName}>
          <AlertCircle size={14} aria-hidden="true" />
          {item.alert}
        </span>
      )}

      {item.description && <p>{item.description}</p>}
    </GlassCard>
  );
}

export default function LeftSidebar({
  locations = [],
  loading = false,
  selectedLocationId,
  onSelectLocation,
  predictions = [],
  recommendations = [],
}) {
  return (
    <aside className="sidebar-left" aria-label="Mission insights and saved locations">
      <motion.div
        className="panel-section sidebar-stack"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.section variants={itemVariants}>
          <div className="panel-heading">
            <div>
              <span className="section-title">AI Insights</span>
              <h3>Prediction Watch</h3>
            </div>
            <Sparkles size={18} aria-hidden="true" />
          </div>

          <div className="insight-list">
            {predictions.length ? (
              predictions.map((prediction) => (
                <InsightCard item={prediction} key={prediction.id} tone="brand" />
              ))
            ) : (
              <GlassCard>
                <p className="muted-copy">No predictions available.</p>
              </GlassCard>
            )}
          </div>
        </motion.section>

        <motion.section variants={itemVariants}>
          <div className="panel-heading">
            <div>
              <span className="section-title">Recommendations</span>
              <h3>Next Actions</h3>
            </div>
            <RadioTower size={18} aria-hidden="true" />
          </div>

          <div className="insight-list">
            {recommendations.length ? (
              recommendations.map((recommendation) => (
                <InsightCard item={recommendation} key={recommendation.id} tone="accent" />
              ))
            ) : (
              <GlassCard>
                <p className="muted-copy">No recommendations at this time.</p>
              </GlassCard>
            )}
          </div>
        </motion.section>

        <motion.section variants={itemVariants}>
          <div className="panel-heading">
            <div>
              <span className="section-title">Observation Sites</span>
              <h3>Saved Locations</h3>
              <p>
                {locations.length} location{locations.length === 1 ? "" : "s"} stored
              </p>
            </div>
            <MapPinned size={18} aria-hidden="true" />
          </div>

          <LocationList
            loading={loading}
            locations={locations}
            onSelect={onSelectLocation}
            selectedLocationId={selectedLocationId}
          />
        </motion.section>
      </motion.div>
    </aside>
  );
}
