import { motion } from "framer-motion";
import Satellite from "../3d/Satellite.jsx";
import Starfield from "../3d/Starfield.jsx";

export default function AuthLayout({ children }) {
  return (
    <main className="space-page auth-layout">
      <Starfield className="space-backdrop" densityVariant="dense" />
      <div className="space-horizon" aria-hidden="true" />
      <motion.div
        aria-hidden="true"
        className="auth-satellite-stage"
        initial={{ opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        <Satellite />
      </motion.div>
      <div className="auth-layout-content">{children}</div>
    </main>
  );
}
