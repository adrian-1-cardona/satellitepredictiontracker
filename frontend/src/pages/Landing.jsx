import { Navigate } from "react-router-dom";
import { Satellite, ShieldCheck } from "lucide-react";
import LoginForm from "../components/LoginForm.jsx";
import RegisterForm from "../components/RegisterForm.jsx";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Landing() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="landing-page">
      <section className="landing-intro" aria-label="Satellite Tracker overview">
        <div className="brand-lockup">
          <span className="brand-mark large">
            <Satellite size={26} aria-hidden="true" />
          </span>
          <span>Satellite Tracker</span>
        </div>
        <h1>Track visible satellite passes from your own observing sites.</h1>
        <p>
          Save locations, inspect upcoming pass windows, and create alert rules backed by
          your FastAPI prediction service.
        </p>
        <div className="landing-proof">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>JWT auth, private locations, and PostgreSQL-backed alerts.</span>
        </div>
      </section>

      <section className="auth-panel" aria-label="Authentication">
        <LoginForm />
        <RegisterForm />
      </section>
    </main>
  );
}
