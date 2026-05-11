import { UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getErrorMessage } from "../../api/client.js";
import { useAuth } from "../../auth/AuthContext.jsx";

export default function RegisterForm() {
  const { register } = useAuth();
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
      await register({ email: form.email.trim(), password: form.password });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Unable to create account."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.form
      className="auth-form"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      onSubmit={handleSubmit}
    >
      <div className="form-heading">
        <h2>Create Account</h2>
        <p>Save observing sites and build alert rules.</p>
      </div>

      {error && <div className="message error" role="alert">{error}</div>}

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
          autoComplete="new-password"
          minLength={8}
          name="password"
          onChange={handleChange}
          placeholder="At least 8 characters"
          required
          type="password"
          value={form.password}
        />
      </label>

      <button className="primary-button" disabled={loading} type="submit">
        <UserPlus size={18} aria-hidden="true" />
        <span>{loading ? "Creating..." : "Sign Up"}</span>
      </button>
    </motion.form>
  );
}
