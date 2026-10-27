"use client";

import { useState } from "react";
import { BellRing, FlaskConical, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useApp } from "@/lib/store";
import type { Thesis } from "@/lib/types";
import { parseAmount } from "@/lib/validation";

/** Summary of a saved stress test, shown on the thesis card. */
export function StressTestSummary({ thesis }: { thesis: Thesis }) {
  const { state } = useApp();
  const st = thesis.stressTest;
  if (!st) return null;
  const alert = st.alertId ? state?.alerts.find((a) => a.id === st.alertId) : undefined;
  return (
    <div className="nudge small" style={{ borderColor: "rgba(167,139,250,0.4)", background: "rgba(124,58,237,0.1)" }}>
      <FlaskConical size={16} style={{ color: "var(--primary-strong)" }} />
      <span className="stack" style={{ gap: 4 }}>
        <span>
          <strong>Stress test — what would prove this wrong:</strong> {st.disproof}
        </span>
        {st.exitPrice || st.exitCondition ? (
          <span className="muted">
            Exit trigger:{" "}
            {st.exitPrice ? `price ${st.exitDirection === "below" ? "falls below" : "rises above"} ${formatCurrency(st.exitPrice)}` : ""}
            {st.exitPrice && st.exitCondition ? " · " : ""}
            {st.exitCondition}
          </span>
        ) : null}
        {alert ? (
          <span className="row gap-sm dim">
            <BellRing size={13} /> Price alert {alert.status === "active" ? "active" : `triggered${alert.triggeredPrice ? ` at ${formatCurrency(alert.triggeredPrice)}` : ""}`}
          </span>
        ) : null}
      </span>
    </div>
  );
}

export function StressTestForm({ thesis, onDone }: { thesis: Thesis; onDone: () => void }) {
  const { actions } = useApp();
  const st = thesis.stressTest;
  const [disproof, setDisproof] = useState(st?.disproof ?? thesis.risks ?? "");
  const [exitPrice, setExitPrice] = useState(st?.exitPrice ? String(st.exitPrice) : "");
  const [direction, setDirection] = useState<"below" | "above">(st?.exitDirection ?? "below");
  const [condition, setCondition] = useState(st?.exitCondition ?? "");
  const [createAlert, setCreateAlert] = useState(Boolean(st?.alertId) || !st);
  const [error, setError] = useState("");
  const id = thesis.id.slice(0, 8);

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const price = exitPrice.trim() ? parseAmount(exitPrice) : undefined;
    if (price === null) return setError("Enter a valid exit price, or leave it blank.");
    try {
      actions.setStressTest(thesis.id, {
        disproof,
        exitPrice: price,
        exitDirection: direction,
        exitCondition: condition,
        createAlert: createAlert && price !== undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the stress test.");
    }
  };

  return (
    <form className="stack gap-md" onSubmit={save} style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
      <div className="field">
        <label htmlFor={`st-disproof-${id}`}>What would prove this wrong?</label>
        <textarea
          id={`st-disproof-${id}`}
          className="textarea"
          value={disproof}
          onChange={(e) => setDisproof(e.target.value)}
          maxLength={2000}
          placeholder="e.g. Two straight quarters of shrinking margins, or losing the key customer."
        />
      </div>
      <div className="grid grid-2">
        <div className="field">
          <label htmlFor={`st-price-${id}`}>Exit trigger price (optional)</label>
          <div className="row gap-sm">
            <select className="select" value={direction} onChange={(e) => setDirection(e.target.value as "below" | "above")} aria-label="Trigger direction" style={{ maxWidth: 130 }}>
              <option value="below">Falls below</option>
              <option value="above">Rises above</option>
            </select>
            <input id={`st-price-${id}`} className="input" inputMode="decimal" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} placeholder="0.00" />
          </div>
        </div>
        <div className="field">
          <label htmlFor={`st-cond-${id}`}>Exit condition (optional)</label>
          <input id={`st-cond-${id}`} className="input" value={condition} onChange={(e) => setCondition(e.target.value)} maxLength={300} placeholder="e.g. CEO leaves, guidance cut" />
        </div>
      </div>
      <label className="row gap-sm small" style={{ cursor: "pointer" }}>
        <input type="checkbox" checked={createAlert} onChange={(e) => setCreateAlert(e.target.checked)} />
        Create a price alert for {thesis.symbol} at the exit price
      </label>
      {error ? (
        <span className="form-error" role="alert">
          {error}
        </span>
      ) : null}
      <div className="row wrap gap-sm">
        <button type="submit" className="btn btn-primary btn-sm">
          Save stress test
        </button>
        <button type="button" className="btn btn-sm" onClick={onDone}>
          Cancel
        </button>
        {st ? (
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={() => {
              actions.clearStressTest(thesis.id);
              onDone();
            }}
          >
            <Trash2 size={14} /> Remove
          </button>
        ) : null}
      </div>
    </form>
  );
}
