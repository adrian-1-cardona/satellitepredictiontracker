import { motion } from "framer-motion";
import EarthGlobe from "../components/3d/EarthGlobe.jsx";
import Starfield from "../components/3d/Starfield.jsx";

export default function AuthLayout({ children }) {
  return (
    <main className="space-page auth-layout">
      <Starfield className="space-backdrop" densityVariant="dense" />
      <motion.div
        aria-hidden="true"
        className="auth-globe-stage"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <EarthGlobe />
      </motion.div>
      <div className="auth-layout-content">{children}</div>
    </main>
  );
}
