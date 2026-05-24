// src/pages/Invoices.js
import React, { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import InvoiceItemsEditor from "../components/InvoiceItemsEditor";
import { useAuth } from "../context/AuthContext";
import { getInvoices, addInvoice, updateInvoice, deleteInvoice, getClients } from "../firebase/firestore";
import { generateInvoicePDF } from "../utils/generatePDF";
import { formatCurrency, formatDate, generateInvoiceNumber, calculateInvoiceTotal, getStatusBadgeClass } from "../utils/helpers";

const defaultItems = [{ description: "", quantity: 1, price: "" }];

const emptyForm = {
  invoiceNumber: "",
  clientId: "",
  clientName: "",
  date: new Date().toISOString().split("T")[0],
  dueDate: "",
  status: "pending",
  currency: "XAF",
  taxRate: 0,
  notes: "",
  items: defaultItems,
};

export default function Invoices() {
  const { currentUser } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyForm, invoiceNumber: generateInvoiceNumber() });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");

  async function load() {
    setLoading(true);
    try {
      const [inv, cl] = await Promise.all([
        getInvoices(currentUser.uid),
        getClients(currentUser.uid),
      ]);
      setInvoices(inv);
      setClients(cl);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [currentUser.uid]);

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm, invoiceNumber: generateInvoiceNumber(), items: [...defaultItems] });
    setShowModal(true);
  }

  function openEdit(inv) {
    setEditing(inv);
    setForm({
      invoiceNumber: inv.invoiceNumber,
      clientId: inv.clientId || "",
      clientName: inv.clientName || "",
      date: inv.date,
      dueDate: inv.dueDate || "",
      status: inv.status || "pending",
      currency: inv.currency || "XAF",
      taxRate: inv.taxRate || 0,
      notes: inv.notes || "",
      items: inv.items?.length ? inv.items : [...defaultItems],
    });
    setShowModal(true);
  }

  function closeModal() { setShowModal(false); setEditing(null); }

  function handleClientChange(clientId) {
    const client = clients.find((c) => c.id === clientId);
    setForm((f) => ({ ...f, clientId, clientName: client?.name || "" }));
  }

  async function handleSave() {
    if (!form.invoiceNumber || !form.clientName) return;
    setSaving(true);
    try {
      const { subtotal, tax, total } = calculateInvoiceTotal(form.items, form.taxRate);
      const data = { ...form, subtotal, tax, total };
      if (editing) await updateInvoice(editing.id, data);
      else await addInvoice(currentUser.uid, data);
      await load();
      closeModal();
    } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this invoice?")) return;
    await deleteInvoice(id);
    await load();
  }

  function handleDownloadPDF(inv) {
    const client = clients.find((c) => c.id === inv.clientId);
    generateInvoicePDF(inv, client, currentUser.displayName || "Billsimp");
  }

  const filtered = filter === "all" ? invoices : invoices.filter((i) => i.status === filter);
  const totals = invoices.reduce((acc, inv) => {
    acc.total += parseFloat(inv.total) || 0;
    if (inv.status === "paid")    acc.paid    += parseFloat(inv.total) || 0;
    if (inv.status === "pending") acc.pending += parseFloat(inv.total) || 0;
    return acc;
  }, { total: 0, paid: 0, pending: 0 });

  const { subtotal, tax, total } = calculateInvoiceTotal(form.items, form.taxRate);

  return (
    <AppLayout title="Invoices">
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""} total</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Invoice
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Total Billed", value: formatCurrency(totals.total, "XAF"), color: "var(--accent)" },
          { label: "Paid",    value: formatCurrency(totals.paid,    "XAF"), color: "var(--success)" },
          { label: "Pending", value: formatCurrency(totals.pending, "XAF"), color: "var(--warning)" },
        ].map((s) => (
          <div key={s.label} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 20px", minWidth: 160 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: 5 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: "var(--font-mono)" }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {["all", "pending", "paid", "overdue", "draft"].map((f) => (
          <button key={f} className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilter(f)} style={{ textTransform: "capitalize" }}>
            {f === "all" ? "All" : f}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 10 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <p className="empty-title">{filter !== "all" ? `No ${filter} invoices` : "No invoices yet"}</p>
            <p className="empty-text">{filter === "all" ? "Create your first invoice to get paid faster." : `No invoices with status "${filter}".`}</p>
            {filter === "all" && <button className="btn btn-primary btn-sm" onClick={openAdd} style={{ marginTop: 4 }}>Create Invoice</button>}
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice #</th><th>Client</th><th>Date</th><th>Due Date</th><th>Total</th><th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id}>
                  <td><span className="tag">{inv.invoiceNumber}</span></td>
                  <td className="td-main">{inv.clientName}</td>
                  <td>{formatDate(inv.date)}</td>
                  <td>{inv.dueDate ? formatDate(inv.dueDate) : <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                  <td style={{ fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                    {formatCurrency(inv.total, inv.currency)}
                  </td>
                  <td><span className={`badge ${getStatusBadgeClass(inv.status)}`}>{inv.status || "pending"}</span></td>
                  <td>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                      <button className="btn btn-success btn-sm btn-icon" title="Download PDF" onClick={() => handleDownloadPDF(inv)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      </button>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Edit" onClick={() => openEdit(inv)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="btn btn-danger btn-sm btn-icon" title="Delete" onClick={() => handleDelete(inv.id)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal modal-xl" style={{ maxHeight: "92vh" }}>
            <div className="modal-header">
              <span className="modal-title">{editing ? "Edit Invoice" : "New Invoice"}</span>
              <button className="btn btn-ghost btn-icon" onClick={closeModal}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body" style={{ gap: 18 }}>
              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">Invoice Number *</label>
                  <input className="form-input" style={{ fontFamily: "var(--font-mono)" }} value={form.invoiceNumber} onChange={(e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value }))} placeholder="INV-2401-0001" />
                </div>
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input type="date" className="form-input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input type="date" className="form-input" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Client *</label>
                  {clients.length > 0 ? (
                    <select className="form-select" value={form.clientId} onChange={(e) => handleClientChange(e.target.value)}>
                      <option value="">Select a client</option>
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>)}
                    </select>
                  ) : null}
                  {(!form.clientId || clients.length === 0) && (
                    <input className="form-input" style={{ marginTop: clients.length ? 8 : 0 }} value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} placeholder="Client name" />
                  )}
                </div>
                <div className="form-grid" style={{ gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                      <option value="draft">Draft</option>
                      <option value="pending">Pending</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Currency</label>
                    <select className="form-select" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>
                      <option value="XAF">FCFA</option>
                      <option value="$">$ USD</option>
                      <option value="€">€ EUR</option>
                      <option value="£">£ GBP</option>
                      <option value="¥">¥ JPY</option>
                      <option value="₦">₦ NGN</option>
                      <option value="KES">KES</option>
                      <option value="ZAR">ZAR</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Invoice Items</label>
                <InvoiceItemsEditor items={form.items} onChange={(items) => setForm((f) => ({ ...f, items }))} currency={form.currency} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                <div className="form-group" style={{ maxWidth: 200 }}>
                  <label className="form-label">Tax Rate (%)</label>
                  <input type="number" min="0" max="100" step="0.1" className="form-input" value={form.taxRate} onChange={(e) => setForm((f) => ({ ...f, taxRate: e.target.value }))} placeholder="0" />
                </div>
                <div className="total-section">
                  <div className="total-row"><span>Subtotal</span><span style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(subtotal, form.currency)}</span></div>
                  {parseFloat(form.taxRate) > 0 && (
                    <div className="total-row"><span>Tax ({form.taxRate}%)</span><span style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(tax, form.currency)}</span></div>
                  )}
                  <div className="total-row grand"><span>Total</span><span style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(total, form.currency)}</span></div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <textarea className="form-textarea" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Payment terms, bank details, thank-you message…" style={{ minHeight: 72 }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.invoiceNumber || !form.clientName}>
                {saving ? <><span className="loading-spinner" /> Saving…</> : (editing ? "Update Invoice" : "Create Invoice")}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
