import { LogIn, UserPlus } from "lucide-react";
import "./TopRightAuthBar.css";

export default function TopRightAuthBar({ onLogin, onSignup }) {
  return (
    <nav className="top-right-auth" aria-label="Account">
      <button type="button" className="auth-pill ghost" onClick={onLogin}>
        <LogIn size={16} aria-hidden="true" />
        <span>Log In</span>
      </button>
      <button type="button" className="auth-pill accent" onClick={onSignup}>
        <UserPlus size={16} aria-hidden="true" />
        <span>Sign Up</span>
      </button>
    </nav>
  );
}
