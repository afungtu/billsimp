// src/utils/aiPredictions.js
// ═══════════════════════════════════════════════════════════════
// KA PILLAR 4 — Construction Technologies: AI Integration
//
// LINEAR REGRESSION formula:  y = mx + b
//
//   y = predicted revenue next month
//   m = slope (average monthly revenue growth)
//   x = next month index
//   b = intercept (starting point)
//
// Example:
//   Jan → 500, Feb → 800, Mar → 1100
//   AI predicts April ≈ 1400
// ═══════════════════════════════════════════════════════════════


// ── groupRevenueByMonth ─────────────────────────────────────────
// Groups raw invoices from Firebase into monthly totals.
// OUTPUT: [{ month: "Jan 2024", total, paid, count }, ...]
export function groupRevenueByMonth(invoices) {
  const map = {};

  invoices.forEach((inv) => {
    if (!inv.date) return;
    const d = new Date(inv.date);
    if (isNaN(d)) return;

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    if (!map[key]) {
      map[key] = {
        key,
        month: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        total: 0,
        paid:  0,
        count: 0,
      };
    }

    const amount = parseFloat(inv.total) || 0;
    map[key].total += amount;
    map[key].count += 1;
    if (inv.status === "paid") map[key].paid += amount;
  });

  return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
}


// ── predictNextMonthRevenue ─────────────────────────────────────
// Runs Linear Regression on monthly data and predicts next month.
//
// Steps:
//   1. Number months (1, 2, 3...)
//   2. Compute averages x̄ and ȳ
//   3. slope  m = Σ(xi−x̄)(yi−ȳ) / Σ(xi−x̄)²
//   4. intercept b = ȳ − m×x̄
//   5. predicted  = m×(n+1) + b
export function predictNextMonthRevenue(monthlyData) {
  if (monthlyData.length < 2) {
    return {
      predicted: 0,
      trend: "neutral",
      confidence: "low",
      monthsAnalyzed: monthlyData.length,
      growthPct: 0,
      slope: 0,
      avgMonthlyGrowth: 0,
      message: "Need at least 2 months of invoice data for AI predictions.",
    };
  }

  const n  = monthlyData.length;
  const xs = monthlyData.map((_, i) => i + 1);
  const ys = monthlyData.map((d) => d.total);

  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;

  let numerator = 0, denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator   += (xs[i] - xMean) * (ys[i] - yMean);
    denominator += (xs[i] - xMean) ** 2;
  }

  const slope     = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;
  const predicted = Math.max(0, slope * (n + 1) + intercept);

  const lastRevenue = ys[n - 1];
  const growthPct   = lastRevenue > 0
    ? ((predicted - lastRevenue) / lastRevenue) * 100
    : 0;

  const trend      = growthPct > 5 ? "up" : growthPct < -5 ? "down" : "neutral";
  const confidence = n >= 6 ? "high" : n >= 3 ? "medium" : "low";

  return {
    predicted:        Math.round(predicted),
    trend,
    growthPct:        Math.round(growthPct * 10) / 10,
    slope:            Math.round(slope),
    confidence,
    monthsAnalyzed:   n,
    avgMonthlyGrowth: Math.round(slope),
  };
}


// ── getTopClients ───────────────────────────────────────────────
// Data mining — finds the highest-revenue clients.
export function getTopClients(invoices, clients, limit = 5) {
  const map = {};

  invoices.forEach((inv) => {
    const key = inv.clientId || inv.clientName;
    if (!key) return;

    if (!map[key]) {
      map[key] = {
        clientId:   inv.clientId   || "",
        clientName: inv.clientName || "Unknown",
        total: 0,
        paid:  0,
        count: 0,
      };
    }

    map[key].total += parseFloat(inv.total) || 0;
    map[key].count += 1;
    if (inv.status === "paid") map[key].paid += parseFloat(inv.total) || 0;
  });

  return Object.values(map).sort((a, b) => b.total - a.total).slice(0, limit);
}


// ── generateInsights ────────────────────────────────────────────
// Converts AI numbers into plain-English insight messages.
export function generateInsights(prediction, monthlyData, topClients) {
  const insights = [];

  if (prediction.trend === "up") {
    insights.push({
      icon:  "📈",
      color: "green",
      text:  `Revenue is growing! AI predicts a <strong>${prediction.growthPct}% increase</strong> next month based on your last ${prediction.monthsAnalyzed} months of data.`,
    });
  } else if (prediction.trend === "down") {
    insights.push({
      icon:  "📉",
      color: "amber",
      text:  `Revenue may decrease by about <strong>${Math.abs(prediction.growthPct)}%</strong> next month. Consider following up on pending invoices or sending new quotations.`,
    });
  } else {
    insights.push({
      icon:  "📊",
      color: "blue",
      text:  `Revenue has been <strong>relatively stable</strong> over the last ${prediction.monthsAnalyzed} months. Keep building your client base to grow faster.`,
    });
  }

  if (topClients.length > 0) {
    const best = topClients[0];
    insights.push({
      icon:  "⭐",
      color: "amber",
      text:  `Your top client is <strong>${best.clientName}</strong> with <strong>${best.count} invoice${best.count !== 1 ? "s" : ""}</strong>. Strong client relationships drive consistent revenue.`,
    });
  }

  if (prediction.confidence === "low") {
    insights.push({
      icon:  "💡",
      color: "blue",
      text:  `<strong>Tip:</strong> AI predictions improve with more data. Create invoices every month and the model will become more accurate over time.`,
    });
  } else if (prediction.confidence === "high") {
    insights.push({
      icon:  "✅",
      color: "green",
      text:  `The AI has analyzed <strong>${prediction.monthsAnalyzed} months</strong> of your data. Predictions are now at <strong>high confidence</strong>.`,
    });
  }

  if (monthlyData.length > 0) {
    const avg = monthlyData.reduce((s, m) => s + m.total, 0) / monthlyData.length;
    insights.push({
      icon:  "📅",
      color: "blue",
      text:  `Your average monthly revenue is <strong>XAF ${Math.round(avg).toLocaleString()}</strong>. Use this as your monthly performance target.`,
    });
  }

  return insights;
}


// ── forecastRevenue ─────────────────────────────────────────────
// Extends the linear regression model to predict the next N months.
// Returns a combined array: historical actuals + future forecasts.
//
// Each forecast entry has { month, actual, paid, forecast, isForecast }
// so a ComposedChart can render both lines on the same axis.
export function forecastRevenue(monthlyData, periods = 3) {
  if (monthlyData.length < 2) return [];

  const n  = monthlyData.length;
  const xs = monthlyData.map((_, i) => i + 1);
  const ys = monthlyData.map((d) => d.total);

  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;

  let numerator = 0, denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator   += (xs[i] - xMean) * (ys[i] - yMean);
    denominator += (xs[i] - xMean) ** 2;
  }

  const slope     = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  const lastKey  = monthlyData[n - 1].key;
  const lastDate = new Date(lastKey + "-01");

  const combined = monthlyData.map((m) => ({
    month:      m.month,
    actual:     m.total,
    paid:       m.paid,
    isForecast: false,
  }));

  for (let p = 1; p <= periods; p++) {
    const predicted = Math.max(0, Math.round(slope * (n + p) + intercept));
    const futureDate = new Date(lastDate);
    futureDate.setMonth(futureDate.getMonth() + p);
    const label = futureDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    combined.push({
      month:      label,
      forecast:   predicted,
      isForecast: true,
    });
  }

  return combined;
}


// ── analyzePaymentBehavior ──────────────────────────────────────
// Data mining: grades each client on how reliably they pay.
// Uses ratio of paid invoices to total invoices per client.
export function analyzePaymentBehavior(invoices) {
  const map = {};

  invoices.forEach((inv) => {
    const key = inv.clientId || inv.clientName;
    if (!key) return;

    if (!map[key]) {
      map[key] = {
        clientName: inv.clientName || "Unknown",
        count:   0,
        paid:    0,
        overdue: 0,
        pending: 0,
        totalBilled: 0,
        totalPaid:   0,
      };
    }

    map[key].count++;
    map[key].totalBilled += parseFloat(inv.total) || 0;
    if (inv.status === "paid")    { map[key].paid++;    map[key].totalPaid += parseFloat(inv.total) || 0; }
    if (inv.status === "overdue")   map[key].overdue++;
    if (inv.status === "pending")   map[key].pending++;
  });

  return Object.values(map)
    .filter((c) => c.count > 0)
    .map((c) => {
      const paymentRate = Math.round((c.paid / c.count) * 100);
      const rating =
        paymentRate >= 80 ? "excellent" :
        paymentRate >= 50 ? "good" :
        c.overdue / c.count >= 0.5 ? "poor" : "fair";
      return { ...c, paymentRate, rating };
    })
    .sort((a, b) => b.paymentRate - a.paymentRate);
}


// ── getMonthlyGrowthRates ───────────────────────────────────────
// Computes month-over-month revenue change in percent.
// Useful for detecting seasonal patterns and trend phases.
export function getMonthlyGrowthRates(monthlyData) {
  if (monthlyData.length < 2) return [];

  return monthlyData.slice(1).map((m, i) => {
    const prev   = monthlyData[i].total;
    const curr   = m.total;
    const growth = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
    return {
      month:  m.month,
      total:  m.total,
      growth: Math.round(growth * 10) / 10,
      trend:  growth > 5 ? "up" : growth < -5 ? "down" : "stable",
    };
  });
}


// ── getServiceBreakdown ─────────────────────────────────────────
// Data mining: aggregates revenue by invoice line-item description.
// Reveals which services or products drive the most income.
export function getServiceBreakdown(invoices) {
  const map = {};

  invoices.forEach((inv) => {
    (inv.items || []).forEach((item) => {
      const desc = (item.description || "").trim();
      if (!desc) return;
      if (!map[desc]) map[desc] = { description: desc, count: 0, revenue: 0 };
      map[desc].count++;
      map[desc].revenue += (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);
    });
  });

  return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
}
