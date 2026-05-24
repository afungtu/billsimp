// src/pages/Dashboard.js
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { getClients, getInvoices, getQuotations } from "../firebase/firestore";
import { formatCurrency, formatDate, getStatusBadgeClass } from "../utils/helpers";

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({ clients: 0, invoices: 0, quotations: 0, revenue: 0 });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [clients, invoices, quotations] = await Promise.all([
          getClients(currentUser.uid),
          getInvoices(currentUser.uid),
          getQuotations(currentUser.uid),
        ]);
        const revenue = invoices
          .filter((inv) => inv.status === "paid")
          .reduce((sum, inv) => sum + (parseFloat(inv.total) || 0), 0);
        setStats({ clients: clients.length, invoices: invoices.length, quotations: quotations.length, revenue });
        setRecentInvoices(invoices.slice(0, 6));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser.uid]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <AppLayout title="Dashboard">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-heading)", marginBottom: 4 }}>
          {greeting()}, {currentUser?.displayName?.split(" ")[0] || "there"} 👋
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Here's what's happening with your business today.
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-header">
            <span className="stat-label">Total Revenue, "XAF"</span>
            <div className="stat-icon blue" style={{ fontSize: "12px", fontWeight: "bold" }}>XAF</div>
          </div>
          <div className="stat-value">{loading ? <span className="skeleton" style={{ width: 80, height: 28, display: "block" }} /> : formatCurrency(stats.revenue)}</div>
          <div className="stat-sub">From paid invoices</div>
        </div>

        <div className="stat-card green">
          <div className="stat-header">
            <span className="stat-label">Clients</span>
            <div className="stat-icon green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
          </div>
          <div className="stat-value">{loading ? <span className="skeleton" style={{ width: 40, height: 28, display: "block" }} /> : stats.clients}</div>
          <div className="stat-sub">Active clients</div>
        </div>

        <div className="stat-card amber">
          <div className="stat-header">
            <span className="stat-label">Invoices</span>
            <div className="stat-icon amber">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
          </div>
          <div className="stat-value">{loading ? <span className="skeleton" style={{ width: 40, height: 28, display: "block" }} /> : stats.invoices}</div>
          <div className="stat-sub">Total invoices</div>
        </div>

        <div className="stat-card purple">
          <div className="stat-header">
            <span className="stat-label">Quotations</span>
            <div className="stat-icon purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </div>
          </div>
          <div className="stat-value">{loading ? <span className="skeleton" style={{ width: 40, height: 28, display: "block" }} /> : stats.quotations}</div>
          <div className="stat-sub">Total quotations</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Invoices</span>
          <Link to="/invoices" className="btn btn-ghost btn-sm">View all →</Link>
        </div>
        {loading ? (
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 42, borderRadius: 8 }} />)}
          </div>
        ) : recentInvoices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <p className="empty-title">No invoices yet</p>
            <p className="empty-text">Create your first invoice to get started.</p>
            <Link to="/invoices" className="btn btn-primary btn-sm" style={{ marginTop: 4 }}>Create Invoice</Link>
          </div>
        ) : (
          <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td><span className="tag">{inv.invoiceNumber}</span></td>
                    <td className="td-main">{inv.clientName}</td>
                    <td>{formatDate(inv.date)}</td>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                      {formatCurrency(inv.total, inv.currency)}
                    </td>
                    <td><span className={`badge ${getStatusBadgeClass(inv.status)}`}>{inv.status || "pending"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
