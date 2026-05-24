// src/pages/Analytics.js
// ═══════════════════════════════════════════════════════════════
// KA PILLAR 4 — Construction Technologies: AI Integration
// KA PILLAR 3 — Integration: React + Firebase + Recharts + AI
//
// This file ONLY handles:
//   1. Loading data from Firebase
//   2. Calling the AI functions
//   3. Displaying results on screen
//
// All styles are in: src/styles/analytics.css
// All AI math is in: src/utils/aiPredictions.js
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState } from "react";
import {
  AreaChart, Area,
  BarChart, Bar,
  ComposedChart, Line,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

import AppLayout        from "../components/AppLayout";
import { useAuth }      from "../context/AuthContext";
import { getInvoices, getClients } from "../firebase/firestore";
import {
  groupRevenueByMonth,
  predictNextMonthRevenue,
  getTopClients,
  generateInsights,
  forecastRevenue,
  analyzePaymentBehavior,
  getMonthlyGrowthRates,
  getServiceBreakdown,
} from "../utils/aiPredictions";
import { formatCurrency } from "../utils/helpers";

import "../styles/analytics.css";


function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="chart-tooltip-value" style={{ color: p.color }}>
          {p.name}: ${p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
}


export default function Analytics() {
  const { currentUser } = useAuth();

  const [invoices, setInvoices] = useState([]);
  const [clients,  setClients]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  const [monthlyData, setMonthlyData] = useState([]);
  const [prediction,  setPrediction]  = useState(null);
  const [topClients,  setTopClients]  = useState([]);
  const [insights,    setInsights]    = useState([]);
  const [statusData,       setStatusData]       = useState([]);
  const [forecastData,     setForecastData]     = useState([]);
  const [growthRates,      setGrowthRates]      = useState([]);
  const [paymentBehavior,  setPaymentBehavior]  = useState([]);
  const [serviceBreakdown, setServiceBreakdown] = useState([]);
  const [loadError,        setLoadError]        = useState(null);

  useEffect(() => {
    if (!currentUser?.uid) return;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const [inv, cl] = await Promise.all([
          getInvoices(currentUser.uid),
          getClients(currentUser.uid),
        ]);

        setInvoices(inv);
        setClients(cl);

        const monthly = groupRevenueByMonth(inv);
        setMonthlyData(monthly);

        const pred = predictNextMonthRevenue(monthly);
        setPrediction(pred);

        const top = getTopClients(inv, cl, 5);
        setTopClients(top);

        const ins = generateInsights(pred, monthly, top);
        setInsights(ins);

        const count = { paid: 0, pending: 0, overdue: 0, draft: 0 };
        inv.forEach((i) => { if (count[i.status] !== undefined) count[i.status]++; });
        setStatusData([
          { name: "Paid",    value: count.paid,    color: "#10b981" },
          { name: "Pending", value: count.pending, color: "#f59e0b" },
          { name: "Overdue", value: count.overdue, color: "#ef4444" },
          { name: "Draft",   value: count.draft,   color: "#4d6380" },
        ]);

        setForecastData(forecastRevenue(monthly, 3));
        setGrowthRates(getMonthlyGrowthRates(monthly));
        setPaymentBehavior(analyzePaymentBehavior(inv));
        setServiceBreakdown(getServiceBreakdown(inv));

      } catch (err) {
        console.error("Analytics load error:", err);
        setLoadError(err?.message || "Failed to load analytics data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser?.uid]);

  const totalRevenue = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + (parseFloat(i.total) || 0), 0);

  const totalBilled = invoices.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);

  const collectionRate = totalBilled > 0
    ? Math.round((totalRevenue / totalBilled) * 100)
    : 0;

  const avgInvoice = invoices.length > 0 ? totalBilled / invoices.length : 0;

  if (loading) {
    return (
      <AppLayout title="Analytics & AI">
        <div className="analytics-loading">
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className="skeleton" style={{ height: i === 1 ? 80 : 200 }} />
          ))}
        </div>
      </AppLayout>
    );
  }

  if (loadError) {
    return (
      <AppLayout title="Analytics & AI">
        <div style={{ padding: "40px 0" }}>
          <div className="alert alert-error" style={{ maxWidth: 600 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <strong>Analytics failed to load</strong>
              <div style={{ fontSize: 12, marginTop: 4, opacity: 0.85 }}>{loadError}</div>
              <div style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }}>
                If this says "index" — open the Firebase Console → Firestore → Indexes and create the missing index, or check your browser Console (F12) for a direct link.
              </div>
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Analytics & AI">

      {/* Intro Banner */}
      <div className="analytics-intro">
        <div className="analytics-intro-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        <div>
          <div className="analytics-intro-title">Intelligent Business Analytics</div>
          <div className="analytics-intro-desc">
            AI-powered financial predictions using Linear Regression and data mining insights from your invoice history.
            {invoices.length === 0 && " Create invoices to unlock predictions."}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="analytics-kpi-grid">
        <div className="stat-card blue">
          <div className="stat-header">
            <span className="stat-label">Total Revenue</span>
            <div className="stat-icon blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
          </div>
          <div className="stat-value">{formatCurrency(totalRevenue)}</div>
          <div className="stat-sub">Collected from paid invoices</div>
        </div>

        <div className="stat-card green">
          <div className="stat-header">
            <span className="stat-label">Collection Rate</span>
            <div className="stat-icon green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          </div>
          <div className="stat-value">{collectionRate}%</div>
          <div className="stat-sub">Of total billed amount</div>
        </div>

        <div className="stat-card amber">
          <div className="stat-header">
            <span className="stat-label">Avg Invoice</span>
            <div className="stat-icon amber">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
          </div>
          <div className="stat-value">{formatCurrency(avgInvoice)}</div>
          <div className="stat-sub">Average invoice value</div>
        </div>

        <div className="stat-card purple">
          <div className="stat-header">
            <span className="stat-label">Months Active</span>
            <div className="stat-icon purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8"  y1="2" x2="8"  y2="6"/>
                <line x1="3"  y1="10" x2="21" y2="10"/>
              </svg>
            </div>
          </div>
          <div className="stat-value">{monthlyData.length}</div>
          <div className="stat-sub">Months with invoice data</div>
        </div>
      </div>

      {/* Charts */}
      <div className="analytics-charts-grid">
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">Revenue Over Time</div>
            <div className="chart-card-subtitle">Monthly billed vs paid — data mining visualization</div>
          </div>
          <div className="chart-body">
            {monthlyData.length === 0 ? (
              <div className="chart-no-data">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
                </svg>
                <span>No monthly data yet.<br/>Create invoices across different months.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="total" name="Billed" stroke="#3b82f6" fill="rgba(59,130,246,0.12)" strokeWidth={2} />
                  <Area type="monotone" dataKey="paid"  name="Paid"   stroke="#10b981" fill="rgba(16,185,129,0.10)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
            {monthlyData.length > 0 && (
              <div className="chart-legend">
                <span className="chart-legend-item"><span className="chart-legend-dot blue"/>Billed</span>
                <span className="chart-legend-item"><span className="chart-legend-dot green"/>Paid</span>
              </div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">Invoice Status Breakdown</div>
            <div className="chart-card-subtitle">Count by status category</div>
          </div>
          <div className="chart-body">
            {invoices.length === 0 ? (
              <div className="chart-no-data">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M8 12h8M8 8h8M8 16h4"/>
                </svg>
                <span>No invoices to analyze yet.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={statusData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <div className="chart-tooltip">
                        <p className="chart-tooltip-label">{label}</p>
                        <p className="chart-tooltip-value" style={{ color: payload[0]?.color }}>{payload[0]?.value} invoices</p>
                      </div>
                    ) : null
                  } />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} fillOpacity={0.85} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* AI Prediction Panel */}
      {prediction && (
        <div className="ai-panel">
          <div className="ai-panel-header">
            <div className="ai-panel-header-row">
              <span className="ai-badge"><span className="ai-badge-dot"/>AI Powered</span>
              <span className="ai-confidence-text">
                Linear Regression · Confidence:{" "}
                <strong className={`ai-confidence-${prediction.confidence}`}>{prediction.confidence}</strong>
              </span>
            </div>
            <div className="ai-panel-title">Financial Prediction — Next Month</div>
          </div>

          <div className="ai-panel-body">
            <div className="prediction-grid">
              <div className="prediction-box">
                <div className="prediction-box-label">Predicted Revenue</div>
                <div className={`prediction-box-value ${prediction.trend}`}>
                  {formatCurrency(prediction.predicted)}
                </div>
                {prediction.monthsAnalyzed >= 2 && (
                  <span className={`prediction-box-change ${prediction.trend === "down" ? "down" : "up"}`}>
                    {prediction.trend === "up" ? "▲" : prediction.trend === "down" ? "▼" : "→"}{" "}
                    {Math.abs(prediction.growthPct)}%
                  </span>
                )}
              </div>

              <div className="prediction-box">
                <div className="prediction-box-label">Monthly Growth Rate</div>
                <div className={`prediction-box-value ${prediction.slope >= 0 ? "up" : "down"}`}>
                  {prediction.slope >= 0 ? "+" : ""}{formatCurrency(prediction.avgMonthlyGrowth || 0)}
                </div>
                <span className="prediction-box-note">per month on average</span>
              </div>

              <div className="prediction-box">
                <div className="prediction-box-label">Data Points</div>
                <div className="prediction-box-value neutral">{prediction.monthsAnalyzed}</div>
                <span className="prediction-box-note">months analyzed</span>
              </div>
            </div>

            <div className="ai-insights">
              {insights.map((ins, i) => (
                <div className="ai-insight" key={i}>
                  <div className={`ai-insight-icon ${ins.color}`}>{ins.icon}</div>
                  <span dangerouslySetInnerHTML={{ __html: ins.text }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Clients */}
      <div className="top-clients-section">
        <div className="card-header">
          <span className="card-title">Top Clients by Revenue</span>
          <span className="card-header-sub">Data mining — client value analysis</span>
        </div>

        {topClients.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
              </svg>
            </div>
            <p className="empty-title">No client data yet</p>
            <p className="empty-text">Create invoices to see your top clients here.</p>
          </div>
        ) : (
          <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Client</th><th>Invoices</th><th>Total Billed</th><th>Total Paid</th><th>Revenue Share</th>
                </tr>
              </thead>
              <tbody>
                {topClients.map((c, i) => {
                  const share = totalBilled > 0 ? (c.total / totalBilled) * 100 : 0;
                  return (
                    <tr key={c.clientId || i}>
                      <td className="rank-number">#{i + 1}</td>
                      <td>
                        <div className="client-name-cell">
                          <div className="client-avatar-small">{c.clientName[0].toUpperCase()}</div>
                          <span className="td-main">{c.clientName}</span>
                        </div>
                      </td>
                      <td>{c.count}</td>
                      <td className="money-cell">{formatCurrency(c.total)}</td>
                      <td className="money-cell paid">{formatCurrency(c.paid)}</td>
                      <td>
                        <div className="share-bar-wrap">
                          <div className="share-bar-track">
                            <div className="share-bar-fill" style={{ width: `${Math.min(share, 100)}%` }} />
                          </div>
                          <span className="share-pct">{Math.round(share)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Revenue Forecast Chart */}
      <div className="chart-card" style={{ marginBottom: 24 }}>
        <div className="chart-card-header">
          <div className="chart-card-title">Revenue Forecast — Next 3 Months</div>
          <div className="chart-card-subtitle">
            Linear regression model · dashed line = AI prediction
          </div>
        </div>
        <div className="chart-body">
          {forecastData.length < 2 ? (
            <div className="chart-no-data">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
              </svg>
              <span>Need at least 2 months of data to generate a forecast.</span>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={forecastData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <div className="chart-tooltip">
                        <p className="chart-tooltip-label">{label}{payload[0]?.payload?.isForecast ? " (forecast)" : ""}</p>
                        {payload.map((p, i) => (
                          <p key={i} className="chart-tooltip-value" style={{ color: p.color }}>
                            {p.name}: ${(p.value || 0).toLocaleString()}
                          </p>
                        ))}
                      </div>
                    ) : null
                  } />
                  {/* Divider between historical and forecast */}
                  {forecastData.findIndex((d) => d.isForecast) > 0 && (
                    <ReferenceLine
                      x={forecastData[forecastData.findIndex((d) => d.isForecast) - 1]?.month}
                      stroke="rgba(139,92,246,0.4)"
                      strokeDasharray="4 4"
                      label={{ value: "now", fill: "var(--text-muted)", fontSize: 10 }}
                    />
                  )}
                  <Area type="monotone" dataKey="actual"   name="Actual"   stroke="#3b82f6" fill="rgba(59,130,246,0.10)" strokeWidth={2} connectNulls />
                  <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="6 4" dot={{ fill: "#8b5cf6", r: 4 }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="chart-legend">
                <span className="chart-legend-item"><span className="chart-legend-dot blue"/>Actual Revenue</span>
                <span className="chart-legend-item"><span className="chart-legend-dot purple"/>Forecasted Revenue</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Monthly Growth Rates */}
      {growthRates.length > 0 && (
        <div className="chart-card" style={{ marginBottom: 24 }}>
          <div className="chart-card-header">
            <div className="chart-card-title">Month-over-Month Growth Rate</div>
            <div className="chart-card-subtitle">Income trend analysis — % change each month</div>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={growthRates} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="chart-tooltip">
                      <p className="chart-tooltip-label">{label}</p>
                      <p className="chart-tooltip-value" style={{ color: payload[0]?.value >= 0 ? "var(--success)" : "var(--danger)" }}>
                        Growth: {payload[0]?.value >= 0 ? "+" : ""}{payload[0]?.value}%
                      </p>
                    </div>
                  ) : null
                } />
                <ReferenceLine y={0} stroke="var(--border-light)" />
                <Bar dataKey="growth" name="Growth %" radius={[4, 4, 0, 0]}>
                  {growthRates.map((entry, i) => (
                    <Cell key={i} fill={entry.growth >= 0 ? "#10b981" : "#ef4444"} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Client Payment Behavior */}
      <div className="top-clients-section" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title">Client Payment Behaviour</span>
          <span className="card-header-sub">Data mining — reliability analysis per client</span>
        </div>

        {paymentBehavior.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
              </svg>
            </div>
            <p className="empty-title">No behaviour data yet</p>
            <p className="empty-text">Create invoices to analyse client payment patterns.</p>
          </div>
        ) : (
          <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Invoices</th>
                  <th>Paid</th>
                  <th>Overdue</th>
                  <th>Payment Rate</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {paymentBehavior.map((c, i) => (
                  <tr key={i}>
                    <td>
                      <div className="client-name-cell">
                        <div className="client-avatar-small">{c.clientName[0].toUpperCase()}</div>
                        <span className="td-main">{c.clientName}</span>
                      </div>
                    </td>
                    <td>{c.count}</td>
                    <td style={{ color: "var(--success)", fontWeight: 600 }}>{c.paid}</td>
                    <td style={{ color: c.overdue > 0 ? "var(--danger)" : "var(--text-muted)", fontWeight: c.overdue > 0 ? 600 : 400 }}>{c.overdue}</td>
                    <td>
                      <div className="share-bar-wrap">
                        <div className="share-bar-track">
                          <div className="share-bar-fill" style={{ width: `${c.paymentRate}%`, background: c.paymentRate >= 80 ? "var(--success)" : c.paymentRate >= 50 ? "var(--warning)" : "var(--danger)" }} />
                        </div>
                        <span className="share-pct">{c.paymentRate}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${c.rating === "excellent" ? "badge-paid" : c.rating === "good" ? "badge-sent" : c.rating === "fair" ? "badge-pending" : "badge-overdue"}`}>
                        {c.rating}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Service / Product Breakdown */}
      {serviceBreakdown.length > 0 && (
        <div className="top-clients-section">
          <div className="card-header">
            <span className="card-title">Top Services by Revenue</span>
            <span className="card-header-sub">Data mining — which line items generate the most income</span>
          </div>
          <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Service / Item</th>
                  <th>Times Invoiced</th>
                  <th>Total Revenue</th>
                  <th>Revenue Share</th>
                </tr>
              </thead>
              <tbody>
                {serviceBreakdown.map((s, i) => {
                  const totalServiceRevenue = serviceBreakdown.reduce((a, b) => a + b.revenue, 0);
                  const share = totalServiceRevenue > 0 ? (s.revenue / totalServiceRevenue) * 100 : 0;
                  return (
                    <tr key={i}>
                      <td className="rank-number">#{i + 1}</td>
                      <td className="td-main">{s.description}</td>
                      <td>{s.count}</td>
                      <td className="money-cell">{formatCurrency(s.revenue)}</td>
                      <td>
                        <div className="share-bar-wrap">
                          <div className="share-bar-track">
                            <div className="share-bar-fill" style={{ width: `${Math.min(share, 100)}%`, background: "var(--purple)" }} />
                          </div>
                          <span className="share-pct">{Math.round(share)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </AppLayout>
  );
}
