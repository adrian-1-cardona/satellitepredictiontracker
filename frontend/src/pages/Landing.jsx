import { Navigate } from "react-router-dom";
import { RadioTower, Satellite, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import LoginForm from "../components/LoginForm.jsx";
import RegisterForm from "../components/RegisterForm.jsx";
import AuthLayout from "../components/layouts/AuthLayout.jsx";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Landing() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AuthLayout>
      <motion.section
        aria-label="Satellite Tracker overview"
        className="landing-intro"
        initial={{ opacity: 0, x: -18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="brand-lockup">
          <span className="brand-mark large">
            <Satellite size={26} aria-hidden="true" />
          </span>
          <span>Satellite Tracker</span>
        </div>
        <h1>Visible satellite passes, plotted from your observing sites.</h1>
        <p>
          Save locations, inspect upcoming pass windows, and create alert rules against
          your FastAPI prediction service.
        </p>
        <div className="landing-proof">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>JWT auth and private observing data stay wired to the existing API.</span>
        </div>
        <div className="signal-readout" aria-label="Interface status">
          <span>
            <RadioTower size={16} aria-hidden="true" />
            Prediction service
          </span>
          <strong>Online</strong>
        </div>
      </motion.section>

      <motion.section
        aria-label="Authentication"
        className="auth-panel"
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.65, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
      >
        <LoginForm />
        <RegisterForm />
      </motion.section>
    </AuthLayout>
  );
}
