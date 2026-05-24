// src/components/Sidebar.js
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  clients: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  invoices: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  quotations: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  analytics: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
};

export default function Sidebar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try { await logout(); navigate("/login"); }
    catch (e) { setLoggingOut(false); }
  }

  const initials = currentUser?.displayName
    ? currentUser.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : currentUser?.email?.[0]?.toUpperCase() || "U";

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">B</div>
        <span className="logo-text">Bill<span>simp</span></span>
      </div>

      <nav className="sidebar-nav">
        <span className="nav-section-label">Main</span>
        <NavLink to="/dashboard" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          {icons.dashboard} Dashboard
        </NavLink>
        <NavLink to="/clients" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          {icons.clients} Clients
        </NavLink>

        <span className="nav-section-label">Billing</span>
        <NavLink to="/invoices" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          {icons.invoices} Invoices
        </NavLink>
        <NavLink to="/quotations" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          {icons.quotations} Quotations
        </NavLink>

        <span className="nav-section-label">Intelligence</span>
        <NavLink to="/analytics" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          {icons.analytics} Analytics & AI
        </NavLink>
      </nav>

      <div className="sidebar-bottom">
        <div className="user-card" onClick={handleLogout} title="Logout">
          <div className="user-avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="user-name">{currentUser?.displayName || currentUser?.email}</div>
            <div className="user-role">
              {loggingOut ? "Signing out…" : "Click to logout"}
            </div>
          </div>
          <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{icons.logout}</span>
        </div>
      </div>
    </aside>
  );
}
