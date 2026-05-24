// src/utils/helpers.js

export function formatCurrency(amount, currency = "$") {
  return `${currency}${parseFloat(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function generateInvoiceNumber(prefix = "INV") {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}${month}-${rand}`;
}

export function calculateInvoiceTotal(items = [], taxRate = 0) {
  const subtotal = items.reduce(
    (sum, item) => sum + parseFloat(item.quantity || 0) * parseFloat(item.price || 0),
    0
  );
  const tax = subtotal * (parseFloat(taxRate) / 100);
  return { subtotal, tax, total: subtotal + tax };
}

export function getStatusBadgeClass(status) {
  const map = {
    paid:     "badge-paid",
    pending:  "badge-pending",
    overdue:  "badge-overdue",
    draft:    "badge-draft",
    sent:     "badge-sent",
    accepted: "badge-paid",
    declined: "badge-overdue",
  };
  return map[status] || "badge-draft";
}

export function timestampToDate(ts) {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  return new Date(ts);
}
