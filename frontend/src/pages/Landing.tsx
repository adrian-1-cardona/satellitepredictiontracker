import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import AuthModal from "../features/auth/AuthModal.jsx";
import TopRightAuthBar from "../components/hero/TopRightAuthBar.jsx";
import StatusIndicator from "../components/hero/StatusIndicator.jsx";
import HeroStage from "../components/hero/HeroStage.jsx";
import "./Landing.css";

export default function Landing() {
  const { isAuthenticated, clearAuth } = useAuth();
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    try {
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Navigation to /dashboard failed", err);
      clearAuth();
    }
  }, [isAuthenticated, navigate, clearAuth]);

  return (
    <main className="globe-hero" aria-label="Satellite Tracker landing">
      <HeroStage />
      <TopRightAuthBar
        onLogin={() => setAuthMode("login")}
        onSignup={() => setAuthMode("register")}
      />
      <div className="hero-overlay">
        <div className="hero-content">
          <h1 className="hero-title">Satellite Pass</h1>
        </div>
        <StatusIndicator />
      </div>
      <AuthModal
        open={authMode !== null}
        initialMode={authMode ?? "login"}
        onClose={() => setAuthMode(null)}
      />
    </main>
  );
}
