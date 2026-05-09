import { LogOut, Radar, Satellite, Siren } from "lucide-react";
import { Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import Alerts from "./pages/Alerts.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Landing from "./pages/Landing.jsx";
import LocationDetail from "./pages/LocationDetail.jsx";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/" replace />;
}

function AppShell({ children }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/dashboard" className="brand" aria-label="Satellite Tracker dashboard">
          <span className="brand-mark">
            <Satellite size={21} aria-hidden="true" />
          </span>
          <span>Satellite Tracker</span>
        </NavLink>

        <nav className="topnav" aria-label="Primary navigation">
          <NavLink to="/dashboard">
            <Radar size={17} aria-hidden="true" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/alerts">
            <Siren size={17} aria-hidden="true" />
            <span>Alerts</span>
          </NavLink>
        </nav>

        <div className="account-strip">
          <span title={user?.email}>{user?.email}</span>
          <button type="button" className="icon-text-button" onClick={handleLogout}>
            <LogOut size={17} aria-hidden="true" />
            <span>Logout</span>
          </button>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppShell>
              <Dashboard />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/locations/:locationId"
        element={
          <ProtectedRoute>
            <AppShell>
              <LocationDetail />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/alerts"
        element={
          <ProtectedRoute>
            <AppShell>
              <Alerts />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
