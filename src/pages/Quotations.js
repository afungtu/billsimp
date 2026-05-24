// src/pages/Quotations.js
import React, { useEffect, useState } from "react";
import AppLayout from "../components/AppLayout";
import InvoiceItemsEditor from "../components/InvoiceItemsEditor";
import { useAuth } from "../context/AuthContext";
import { getQuotations, addQuotation, updateQuotation, deleteQuotation, getClients, addInvoice } from "../firebase/firestore";
import { generateQuotationPDF } from "../utils/generatePDF";
import { formatCurrency, formatDate, generateInvoiceNumber, calculateInvoiceTotal, getStatusBadgeClass } from "../utils/helpers";

const defaultItems = [{ description: "", quantity: 1, price: "" }];

const emptyForm = {
  quotationNumber: "",
  clientId: "",
  clientName: "",
  date: new Date().toISOString().split("T")[0],
  validUntil: "",
  status: "draft",
  currency: "XAF",
  notes: "",
  items: defaultItems,
};

export default function Quotations() {
  const { currentUser } = useAuth();
  const [quotations, setQuotations] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyForm, quotationNumber: generateInvoiceNumber("QUO") });
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [quot, cl] = await Promise.all([
        getQuotations(currentUser.uid),
        getClients(currentUser.uid),
      ]);
      setQuotations(quot);
      setClients(cl);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [currentUser.uid]);

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm, quotationNumber: generateInvoiceNumber("QUO"), items: [...defaultItems] });
    setShowModal(true);
  }

  function openEdit(q) {
    setEditing(q);
    setForm({
      quotationNumber: q.quotationNumber,
      clientId: q.clientId || "",
      clientName: q.clientName || "",
      date: q.date,
      validUntil: q.validUntil || "",
      status: q.status || "draft",
      currency: q.currency || "$",
      notes: q.notes || "",
      items: q.items?.length ? q.items : [...defaultItems],
    });
    setShowModal(true);
  }

  function closeModal() { setShowModal(false); setEditing(null); }

  function handleClientChange(clientId) {
    const client = clients.find((c) => c.id === clientId);
    setForm((f) => ({ ...f, clientId, clientName: client?.name || "" }));
  }

  async function handleSave() {
    if (!form.quotationNumber || !form.clientName) return;
    setSaving(true);
    try {
      const { subtotal, total } = calculateInvoiceTotal(form.items, 0);
      const data = { ...form, subtotal, total };
      if (editing) await updateQuotation(editing.id, data);
      else await addQuotation(currentUser.uid, data);
      await load();
      closeModal();
    } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this quotation?")) return;
    await deleteQuotation(id);
    await load();
  }

  async function convertToInvoice(quot) {
    if (!window.confirm(`Convert quotation ${quot.quotationNumber} to an invoice?`)) return;
    setConverting(quot.id);
    try {
      const { subtotal, tax, total } = calculateInvoiceTotal(quot.items, 0);
      await addInvoice(currentUser.uid, {
        invoiceNumber: generateInvoiceNumber("INV"),
        clientId: quot.clientId || "",
        clientName: quot.clientName,
        date: new Date().toISOString().split("T")[0],
        dueDate: "",
        status: "pending",
        currency: quot.currency || "$",
        taxRate: 0,
        notes: quot.notes || "",
        items: quot.items,
        subtotal, tax, total,
        fromQuotation: quot.quotationNumber,
      });
      await updateQuotation(quot.id, { status: "accepted" });
      await load();
      alert("Quotation converted to invoice successfully!");
    } finally { setConverting(null); }
  }

  function handleDownloadPDF(quot) {
    const client = clients.find((c) => c.id === quot.clientId);
    generateQuotationPDF(quot, client, currentUser.displayName || "Billsimp");
  }

  const { subtotal, total } = calculateInvoiceTotal(form.items, 0);

  return (
    <AppLayout title="Quotations">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quotations</h1>
          <p className="page-subtitle">{quotations.length} quotation{quotations.length !== 1 ? "s" : ""} total</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Quotation
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 10 }} />)}
        </div>
      ) : quotations.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            </div>
            <p className="empty-title">No quotations yet</p>
            <p className="empty-text">Create a quotation and convert it to an invoice when accepted.</p>
            <button className="btn btn-primary btn-sm" onClick={openAdd} style={{ marginTop: 4 }}>Create Quotation</button>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Quote #</th><th>Client</th><th>Date</th><th>Valid Until</th><th>Total</th><th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((q) => (
                <tr key={q.id}>
                  <td><span className="tag" style={{ background: "rgba(16,185,129,0.08)", color: "var(--success)", borderColor: "rgba(16,185,129,0.2)" }}>{q.quotationNumber}</span></td>
                  <td className="td-main">{q.clientName}</td>
                  <td>{formatDate(q.date)}</td>
                  <td>{q.validUntil ? formatDate(q.validUntil) : <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                  <td style={{ fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                    {formatCurrency(q.total, q.currency)}
                  </td>
                  <td><span className={`badge ${getStatusBadgeClass(q.status)}`}>{q.status || "draft"}</span></td>
                  <td>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                      <button className="btn btn-success btn-sm" style={{ fontSize: 12, padding: "5px 10px" }} title="Convert to Invoice" onClick={() => convertToInvoice(q)} disabled={converting === q.id || q.status === "accepted"}>
                        {converting === q.id ? <span className="loading-spinner" /> : "→ Invoice"}
                      </button>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Download PDF" onClick={() => handleDownloadPDF(q)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      </button>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Edit" onClick={() => openEdit(q)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="btn btn-danger btn-sm btn-icon" title="Delete" onClick={() => handleDelete(q.id)}>
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
              <span className="modal-title">{editing ? "Edit Quotation" : "New Quotation"}</span>
              <button className="btn btn-ghost btn-icon" onClick={closeModal}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body" style={{ gap: 18 }}>
              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">Quotation Number *</label>
                  <input className="form-input" style={{ fontFamily: "var(--font-mono)" }} value={form.quotationNumber} onChange={(e) => setForm((f) => ({ ...f, quotationNumber: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Valid Until</label>
                  <input type="date" className="form-input" value={form.validUntil} onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))} />
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
                      <option value="sent">Sent</option>
                      <option value="accepted">Accepted</option>
                      <option value="declined">Declined</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Currency</label>
                    <select className="form-select" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>
                      <option value="XAF">FCFA</option>
                      <option value="$">$ USD</option>
                      <option value="€">€ EUR</option>
                      <option value="£">£ GBP</option>
                      <option value="₦">₦ NGN</option>
                      <option value="KES">KES</option>
                      <option value="ZAR">ZAR</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Items</label>
                <InvoiceItemsEditor items={form.items} onChange={(items) => setForm((f) => ({ ...f, items }))} currency={form.currency} />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 20px", minWidth: 240 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>
                    <span>Subtotal</span><span style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(subtotal, form.currency)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 700, color: "var(--text-heading)", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                    <span>Total</span><span style={{ fontFamily: "var(--font-mono)" }}>{formatCurrency(total, form.currency)}</span>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <textarea className="form-textarea" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Terms, validity notes, contact info…" style={{ minHeight: 70 }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.quotationNumber || !form.clientName}>
                {saving ? <><span className="loading-spinner" /> Saving…</> : (editing ? "Update Quotation" : "Create Quotation")}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
