import { LogIn, RadioTower, Satellite, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import AuthModal from "../features/auth/AuthModal.jsx";
import AuthLayout from "../layouts/AuthLayout.jsx";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const [authMode, setAuthMode] = useState(null);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AuthLayout>
      <motion.section
        aria-label="Satellite Tracker overview"
        className="landing-hero"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="brand-lockup">
          <span className="brand-mark large">
            <Satellite size={26} aria-hidden="true" />
          </span>
          <span>Satellite Tracker</span>
        </div>

        <h1>Real-time orbital tracking.</h1>
        <p>
          Save observing sites, forecast visible passes, and set alert rules against
          your prediction service.
        </p>

        <div className="landing-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => setAuthMode("login")}
          >
            <LogIn size={18} aria-hidden="true" />
            <span>Log In</span>
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setAuthMode("register")}
          >
            <UserPlus size={18} aria-hidden="true" />
            <span>Sign Up</span>
          </button>
        </div>

        <div className="signal-readout" aria-label="Interface status">
          <span>
            <RadioTower size={16} aria-hidden="true" />
            Prediction service
          </span>
          <strong>Online</strong>
        </div>
      </motion.section>

      <AuthModal
        open={authMode !== null}
        initialMode={authMode ?? "login"}
        onClose={() => setAuthMode(null)}
      />
    </AuthLayout>
  );
}
