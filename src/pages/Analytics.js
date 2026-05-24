// src/pages/Analytics.js
// ═══════════════════════════════════════════════════════════════
// KA PILLAR 4 — Construction Technologies: AI Integration
// KA PILLAR 3 — Integration: React + Firebase + Recharts + AI
// ═══════════════════════════════════════════════════════════════

import React, { Component, useEffect, useState } from "react";
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

// ── Currency symbol used throughout this page ───────────────────
const CUR = "XAF ";

// ── Chart colors (hardcoded hex — CSS vars don't work in SVG) ───
const CH = {
  border:      "#1e2d4a",
  borderLight: "#253352",
  textMuted:   "#4d6380",
  blue:        "#3b82f6",
  green:       "#10b981",
  purple:      "#8b5cf6",
  amber:       "#f59e0b",
  danger:      "#ef4444",
};

// ── Mobile detection hook ───────────────────────────────────────
// Returns true when screen width is below 700px.
// Used to skip recharts SVG on mobile (SVG crashes on some phones).
function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    function check() { setMobile(window.innerWidth < 700); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

// ── Error Boundary ──────────────────────────────────────────────
class AnalyticsErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("Analytics crash:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <AppLayout title="Analytics & AI">
          <div style={{ padding: "40px 0", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#ef4444", marginBottom: 8 }}>
              Analytics failed to render
            </div>
            <div style={{ fontSize: 13, color: "#8fa3c0", marginBottom: 20, maxWidth: 400, margin: "0 auto 20px" }}>
              {this.state.error?.message || "An unexpected error occurred."}
            </div>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </AppLayout>
      );
    }
    return this.props.children;
  }
}

// ── Custom tooltip ──────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="chart-tooltip-value" style={{ color: p.color }}>
          {p.name}: {CUR}{(p.value || 0).toLocaleString()}
        </p>
      ))}
    </div>
  );
}

// ── Mobile chart replacement ────────────────────────────────────
// Simple CSS-only bars — no SVG, no recharts, works on all phones.
function MobileBarList({ data, valueKey, labelKey, colorKey, formatVal }) {
  if (!data || data.length === 0) return (
    <p style={{ color: "#4d6380", fontSize: 13, padding: "16px 0" }}>No data yet.</p>
  );
  const max = Math.max(...data.map((d) => Math.abs(d[valueKey] || 0)), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((d, i) => {
        const val   = d[valueKey] || 0;
        const pct   = Math.abs(val / max) * 100;
        const color = colorKey ? d[colorKey] : (val >= 0 ? CH.green : CH.danger);
        return (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4, color: "#8fa3c0" }}>
              <span>{d[labelKey]}</span>
              <span style={{ color, fontWeight: 600 }}>
                {formatVal ? formatVal(val) : val}
              </span>
            </div>
            <div style={{ height: 8, background: "#1e2d4a", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.4s ease" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}


// ── Main analytics content ──────────────────────────────────────
function AnalyticsContent() {
  const { currentUser } = useAuth();
  const isMobile = useIsMobile();

  const [invoices,        setInvoices]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [monthlyData,     setMonthlyData]     = useState([]);
  const [prediction,      setPrediction]      = useState(null);
  const [topClients,      setTopClients]      = useState([]);
  const [insights,        setInsights]        = useState([]);
  const [statusData,      setStatusData]      = useState([]);
  const [forecastData,    setForecastData]    = useState([]);
  const [growthRates,     setGrowthRates]     = useState([]);
  const [paymentBehavior, setPaymentBehavior] = useState([]);
  const [serviceBreakdown,setServiceBreakdown]= useState([]);
  const [loadError,       setLoadError]       = useState(null);

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

        const monthly = groupRevenueByMonth(inv);
        setMonthlyData(monthly);

        const pred = predictNextMonthRevenue(monthly);
        setPrediction(pred);

        const top = getTopClients(inv, cl, 5);
        setTopClients(top);

        setInsights(generateInsights(pred, monthly, top));

        const count = { paid: 0, pending: 0, overdue: 0, draft: 0 };
        inv.forEach((i) => { if (count[i.status] !== undefined) count[i.status]++; });
        setStatusData([
          { name: "Paid",    value: count.paid,    color: CH.green  },
          { name: "Pending", value: count.pending, color: CH.amber  },
          { name: "Overdue", value: count.overdue, color: CH.danger },
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

  const totalRevenue   = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
  const totalBilled    = invoices.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
  const collectionRate = totalBilled > 0 ? Math.round((totalRevenue / totalBilled) * 100) : 0;
  const avgInvoice     = invoices.length > 0 ? totalBilled / invoices.length : 0;

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
            <strong>Analytics failed to load</strong>
            <div style={{ fontSize: 12, marginTop: 4 }}>{loadError}</div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </AppLayout>
    );
  }

  const forecastStartIdx = forecastData.findIndex((d) => d.isForecast);

  return (
    <AppLayout title="Analytics & AI">

      {/* ── Intro Banner ─────────────────────────────────── */}
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

      {/* ── KPI Cards ────────────────────────────────────── */}
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
          <div className="stat-value">{formatCurrency(totalRevenue, CUR)}</div>
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
          <div className="stat-value">{formatCurrency(avgInvoice, CUR)}</div>
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

      {/* ── Revenue + Status Charts ───────────────────────── */}
      <div className="analytics-charts-grid">
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">Revenue Over Time</div>
            <div className="chart-card-subtitle">Monthly billed vs paid</div>
          </div>
          <div className="chart-body">
            {monthlyData.length === 0 ? (
              <div className="chart-no-data">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                <span>No monthly data yet. Create invoices across different months.</span>
              </div>
            ) : isMobile ? (
              /* ── Mobile: CSS bars instead of SVG chart ── */
              <MobileBarList
                data={monthlyData}
                labelKey="month"
                valueKey="total"
                formatVal={(v) => `${CUR}${v.toLocaleString()}`}
              />
            ) : (
              <ResponsiveContainer width="100%" height={220} minWidth={0}>
                <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CH.border} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: CH.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: CH.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="total" name="Billed" stroke={CH.blue}  fill="rgba(59,130,246,0.12)" strokeWidth={2} />
                  <Area type="monotone" dataKey="paid"  name="Paid"   stroke={CH.green} fill="rgba(16,185,129,0.10)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
            {monthlyData.length > 0 && !isMobile && (
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12h8M8 8h8M8 16h4"/></svg>
                <span>No invoices to analyze yet.</span>
              </div>
            ) : isMobile ? (
              <MobileBarList
                data={statusData}
                labelKey="name"
                valueKey="value"
                colorKey="color"
                formatVal={(v) => `${v} invoices`}
              />
            ) : (
              <ResponsiveContainer width="100%" height={220} minWidth={0}>
                <BarChart data={statusData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CH.border} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: CH.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: CH.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
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

      {/* ── AI Prediction Panel ───────────────────────────── */}
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
                  {formatCurrency(prediction.predicted, CUR)}
                </div>
                {prediction.monthsAnalyzed >= 2 && (
                  <span className={`prediction-box-change ${prediction.trend === "down" ? "down" : "up"}`}>
                    {prediction.trend === "up" ? "▲" : prediction.trend === "down" ? "▼" : "→"} {Math.abs(prediction.growthPct)}%
                  </span>
                )}
              </div>
              <div className="prediction-box">
                <div className="prediction-box-label">Monthly Growth Rate</div>
                <div className={`prediction-box-value ${prediction.slope >= 0 ? "up" : "down"}`}>
                  {prediction.slope >= 0 ? "+" : ""}{formatCurrency(prediction.avgMonthlyGrowth || 0, CUR)}
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

      {/* ── Top Clients Table ─────────────────────────────── */}
      <div className="top-clients-section">
        <div className="card-header">
          <span className="card-title">Top Clients by Revenue</span>
          <span className="card-header-sub">Data mining — client value analysis</span>
        </div>
        {topClients.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            </div>
            <p className="empty-title">No client data yet</p>
            <p className="empty-text">Create invoices to see your top clients here.</p>
          </div>
        ) : (
          <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
            <table>
              <thead>
                <tr><th>#</th><th>Client</th><th>Invoices</th><th>Total Billed</th><th>Total Paid</th><th>Share</th></tr>
              </thead>
              <tbody>
                {topClients.map((c, i) => {
                  const share   = totalBilled > 0 ? (c.total / totalBilled) * 100 : 0;
                  const initial = (c.clientName || "?")[0].toUpperCase();
                  return (
                    <tr key={c.clientId || i}>
                      <td className="rank-number">#{i + 1}</td>
                      <td>
                        <div className="client-name-cell">
                          <div className="client-avatar-small">{initial}</div>
                          <span className="td-main">{c.clientName || "Unknown"}</span>
                        </div>
                      </td>
                      <td>{c.count}</td>
                      <td className="money-cell">{formatCurrency(c.total, CUR)}</td>
                      <td className="money-cell paid">{formatCurrency(c.paid, CUR)}</td>
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

      {/* ── Revenue Forecast Chart ────────────────────────── */}
      <div className="chart-card" style={{ marginBottom: 24, marginTop: 24 }}>
        <div className="chart-card-header">
          <div className="chart-card-title">Revenue Forecast — Next 3 Months</div>
          <div className="chart-card-subtitle">Linear regression · dashed = AI prediction</div>
        </div>
        <div className="chart-body">
          {forecastData.length < 2 ? (
            <div className="chart-no-data">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
              <span>Need at least 2 months of data to forecast.</span>
            </div>
          ) : isMobile ? (
            <MobileBarList
              data={forecastData}
              labelKey="month"
              valueKey={forecastData[0]?.actual !== undefined ? "actual" : "forecast"}
              formatVal={(v) => v ? `${CUR}${v.toLocaleString()}` : "—"}
            />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240} minWidth={0}>
                <ComposedChart data={forecastData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CH.border} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: CH.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: CH.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <div className="chart-tooltip">
                        <p className="chart-tooltip-label">{label}{payload[0]?.payload?.isForecast ? " (forecast)" : ""}</p>
                        {payload.map((p, i) => (
                          <p key={i} className="chart-tooltip-value" style={{ color: p.color }}>
                            {p.name}: {CUR}{(p.value || 0).toLocaleString()}
                          </p>
                        ))}
                      </div>
                    ) : null
                  } />
                  {forecastStartIdx > 0 && (
                    <ReferenceLine
                      x={forecastData[forecastStartIdx - 1]?.month}
                      stroke="rgba(139,92,246,0.5)"
                      strokeDasharray="4 4"
                      label={{ value: "now", fill: CH.textMuted, fontSize: 10 }}
                    />
                  )}
                  <Area type="monotone" dataKey="actual"   name="Actual"   stroke={CH.blue}   fill="rgba(59,130,246,0.10)" strokeWidth={2} connectNulls />
                  <Line type="monotone" dataKey="forecast" name="Forecast" stroke={CH.purple} strokeWidth={2} strokeDasharray="6 4" dot={{ fill: CH.purple, r: 4 }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="chart-legend">
                <span className="chart-legend-item"><span className="chart-legend-dot blue"/>Actual</span>
                <span className="chart-legend-item"><span className="chart-legend-dot purple"/>Forecasted</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Monthly Growth Rates ──────────────────────────── */}
      {growthRates.length > 0 && (
        <div className="chart-card" style={{ marginBottom: 24 }}>
          <div className="chart-card-header">
            <div className="chart-card-title">Month-over-Month Growth Rate</div>
            <div className="chart-card-subtitle">Income trend analysis — % change each month</div>
          </div>
          <div className="chart-body">
            {isMobile ? (
              <MobileBarList
                data={growthRates}
                labelKey="month"
                valueKey="growth"
                formatVal={(v) => `${v >= 0 ? "+" : ""}${v}%`}
              />
            ) : (
              <ResponsiveContainer width="100%" height={200} minWidth={0}>
                <BarChart data={growthRates} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CH.border} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: CH.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: CH.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <div className="chart-tooltip">
                        <p className="chart-tooltip-label">{label}</p>
                        <p className="chart-tooltip-value" style={{ color: payload[0]?.value >= 0 ? CH.green : CH.danger }}>
                          Growth: {payload[0]?.value >= 0 ? "+" : ""}{payload[0]?.value}%
                        </p>
                      </div>
                    ) : null
                  } />
                  <ReferenceLine y={0} stroke={CH.borderLight} />
                  <Bar dataKey="growth" radius={[4, 4, 0, 0]}>
                    {growthRates.map((entry, i) => (
                      <Cell key={i} fill={entry.growth >= 0 ? CH.green : CH.danger} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* ── Client Payment Behaviour ──────────────────────── */}
      <div className="top-clients-section" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title">Client Payment Behaviour</span>
          <span className="card-header-sub">Data mining — reliability per client</span>
        </div>
        {paymentBehavior.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            </div>
            <p className="empty-title">No behaviour data yet</p>
            <p className="empty-text">Create invoices to analyse client payment patterns.</p>
          </div>
        ) : (
          <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
            <table>
              <thead>
                <tr><th>Client</th><th>Invoices</th><th>Paid</th><th>Overdue</th><th>Rate</th><th>Rating</th></tr>
              </thead>
              <tbody>
                {paymentBehavior.map((c, i) => {
                  const barColor = c.paymentRate >= 80 ? CH.green : c.paymentRate >= 50 ? CH.amber : CH.danger;
                  const initial  = (c.clientName || "?")[0].toUpperCase();
                  return (
                    <tr key={i}>
                      <td>
                        <div className="client-name-cell">
                          <div className="client-avatar-small">{initial}</div>
                          <span className="td-main">{c.clientName || "Unknown"}</span>
                        </div>
                      </td>
                      <td>{c.count}</td>
                      <td style={{ color: CH.green, fontWeight: 600 }}>{c.paid}</td>
                      <td style={{ color: c.overdue > 0 ? CH.danger : CH.textMuted, fontWeight: c.overdue > 0 ? 600 : 400 }}>{c.overdue}</td>
                      <td>
                        <div className="share-bar-wrap">
                          <div className="share-bar-track">
                            <div className="share-bar-fill" style={{ width: `${c.paymentRate}%`, background: barColor }} />
                          </div>
                          <span className="share-pct">{c.paymentRate}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${
                          c.rating === "excellent" ? "badge-paid"    :
                          c.rating === "good"      ? "badge-sent"    :
                          c.rating === "fair"      ? "badge-pending" : "badge-overdue"
                        }`}>{c.rating}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Top Services Table ────────────────────────────── */}
      {serviceBreakdown.length > 0 && (
        <div className="top-clients-section">
          <div className="card-header">
            <span className="card-title">Top Services by Revenue</span>
            <span className="card-header-sub">Data mining — which services earn the most</span>
          </div>
          <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
            <table>
              <thead>
                <tr><th>#</th><th>Service / Item</th><th>Times Invoiced</th><th>Total Revenue</th><th>Share</th></tr>
              </thead>
              <tbody>
                {serviceBreakdown.map((s, i) => {
                  const totalSvcRev = serviceBreakdown.reduce((a, b) => a + b.revenue, 0);
                  const share = totalSvcRev > 0 ? (s.revenue / totalSvcRev) * 100 : 0;
                  return (
                    <tr key={i}>
                      <td className="rank-number">#{i + 1}</td>
                      <td className="td-main">{s.description}</td>
                      <td>{s.count}</td>
                      <td className="money-cell">{formatCurrency(s.revenue, CUR)}</td>
                      <td>
                        <div className="share-bar-wrap">
                          <div className="share-bar-track">
                            <div className="share-bar-fill" style={{ width: `${Math.min(share, 100)}%`, background: CH.purple }} />
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


// ── Default export wrapped in error boundary ────────────────────
export default function Analytics() {
  return (
    <AnalyticsErrorBoundary>
      <AnalyticsContent />
    </AnalyticsErrorBoundary>
  );
}
