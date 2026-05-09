import { LogIn } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getErrorMessage } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login({ email: form.email.trim(), password: form.password });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Unable to sign in."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="form-heading">
        <h2>Login</h2>
        <p>Resume watching passes from your saved locations.</p>
      </div>

      {error && <div className="message error">{error}</div>}

      <label>
        <span>Email</span>
        <input
          autoComplete="email"
          name="email"
          onChange={handleChange}
          placeholder="you@example.com"
          required
          type="email"
          value={form.email}
        />
      </label>

      <label>
        <span>Password</span>
        <input
          autoComplete="current-password"
          minLength={1}
          name="password"
          onChange={handleChange}
          placeholder="Your password"
          required
          type="password"
          value={form.password}
        />
      </label>

      <button className="primary-button" disabled={loading} type="submit">
        <LogIn size={18} aria-hidden="true" />
        <span>{loading ? "Signing in..." : "Login"}</span>
      </button>
    </form>
  );
}
