// src/components/InvoiceItemsEditor.js
import React from "react";
import { formatCurrency } from "../utils/helpers";

export default function InvoiceItemsEditor({ items, onChange, currency = "$" }) {
  function updateItem(index, field, value) {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange(updated);
  }

  function addItem() {
    onChange([...items, { description: "", quantity: 1, price: "" }]);
  }

  function removeItem(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  const subtotal = items.reduce(
    (sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0),
    0
  );

  return (
    <div>
      <div className="table-wrap">
        <table className="items-table">
          <thead>
            <tr>
              <th style={{ width: "42%" }}>Description</th>
              <th style={{ width: "14%" }}>Qty</th>
              <th style={{ width: "18%" }}>Unit Price</th>
              <th style={{ width: "18%" }}>Total</th>
              <th style={{ width: "8%" }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td>
                  <input
                    className="form-input"
                    value={item.description}
                    onChange={(e) => updateItem(i, "description", e.target.value)}
                    placeholder="Item description"
                  />
                </td>
                <td>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, "quantity", e.target.value)}
                    placeholder="1"
                    style={{ textAlign: "center" }}
                  />
                </td>
                <td>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.price}
                    onChange={(e) => updateItem(i, "price", e.target.value)}
                    placeholder="0.00"
                    style={{ textAlign: "right" }}
                  />
                </td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", padding: "8px 12px" }}>
                  {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0), currency)}
                </td>
                <td style={{ textAlign: "center", padding: "8px 6px" }}>
                  <button
                    className="btn btn-danger btn-icon"
                    onClick={() => removeItem(i)}
                    disabled={items.length === 1}
                    style={{ padding: 5 }}
                    title="Remove"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 12, gap: 16, flexWrap: "wrap" }}>
        <button className="btn btn-secondary btn-sm" onClick={addItem} type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Item
        </button>

        <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text-secondary)" }}>
          Subtotal: <strong style={{ color: "var(--text-heading)", marginLeft: 12 }}>
            {formatCurrency(subtotal, currency)}
          </strong>
        </div>
      </div>
    </div>
  );
}
