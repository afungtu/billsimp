// src/pages/Register.js
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [form, setForm] = useState({ name: "", company: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    setLoading(true);
    try {
      await register(form.email, form.password, form.name, form.company);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.code === "auth/email-already-in-use" ? "An account with this email already exists." :
        err.code === "auth/invalid-email"         ? "Invalid email address." :
        err.code === "auth/weak-password"         ? "Password is too weak." :
        "Failed to create account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="auth-logo">
          <div className="logo-icon">B</div>
          <span className="logo-text" style={{ fontSize: 20, fontWeight: 700, color: "var(--text-heading)" }}>
            Bill<span style={{ color: "var(--accent)" }}>simp</span>
          </span>
        </div>

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Start managing invoices in minutes — free forever.</p>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input name="name" type="text" className="form-input" placeholder="Jane Smith" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Company name</label>
              <input name="company" type="text" className="form-input" placeholder="Acme Inc." value={form.company} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email address</label>
            <input name="email" type="email" className="form-input" placeholder="you@company.com" value={form.email} onChange={handleChange} required autoComplete="email" />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Password</label>
              <input name="password" type="password" className="form-input" placeholder="Min. 6 characters" value={form.password} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm password</label>
              <input name="confirm" type="password" className="form-input" placeholder="Repeat password" value={form.confirm} onChange={handleChange} required />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "12px", marginTop: 4 }}>
            {loading ? <><span className="loading-spinner" /> Creating account…</> : "Create free account"}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
