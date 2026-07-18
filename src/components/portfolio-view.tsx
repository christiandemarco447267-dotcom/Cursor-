"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useApp } from "@/lib/app-context";
import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
} from "@/lib/format";
import { nameForSymbol } from "@/lib/market";
import { Button, EmptyState, Field, Input, PageHeader, Panel } from "@/components/ui";

export function PortfolioView() {
  const { ready, summary, addHoldingAction, removeHoldingAction } = useApp();
  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState("10");
  const [avgCost, setAvgCost] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!ready) return <div className="loading-block">Loading portfolio…</div>;

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const sym = symbol.trim().toUpperCase();
    const sh = Number(shares);
    const cost = Number(avgCost);
    if (!/^[A-Z.\-]{1,12}$/.test(sym)) {
      setError("Enter a valid ticker (letters only).");
      return;
    }
    if (!Number.isFinite(sh) || sh <= 0) {
      setError("Shares must be a positive number.");
      return;
    }
    if (!Number.isFinite(cost) || cost < 0) {
      setError("Average cost must be zero or greater.");
      return;
    }
    const err = addHoldingAction({
      symbol: sym,
      name: nameForSymbol(sym),
      shares: sh,
      avgCost: cost,
    });
    if (err) {
      setError(err);
      return;
    }
    setSymbol("");
    setShares("10");
    setAvgCost("");
  }

  return (
    <div className="stack gap-lg animate-in">
      <PageHeader
        title="Portfolio"
        subtitle="Paper holdings with validated local persistence."
      />

      <div className="stat-grid">
        <Panel>
          <span className="eyebrow">Total value</span>
          <p className="big-number">{formatCurrency(summary.total)}</p>
        </Panel>
        <Panel>
          <span className="eyebrow">Investments</span>
          <p className="big-number">{formatCurrency(summary.investments)}</p>
        </Panel>
        <Panel>
          <span className="eyebrow">Cash</span>
          <p className="big-number">{formatCurrency(summary.cash)}</p>
        </Panel>
        <Panel>
          <span className="eyebrow">All-time P/L</span>
          <p className={`big-number ${summary.gain >= 0 ? "c-gain" : "c-loss"}`}>
            {formatSignedCurrency(summary.gain)}
          </p>
        </Panel>
      </div>

      <Panel>
        <h2 className="section-title">Holdings</h2>
        {summary.holdings.length === 0 ? (
          <EmptyState
            title="No holdings yet"
            body="Add a paper position to start tracking performance."
          />
        ) : (
          <ul className="holding-list">
            {summary.holdings.map((h) => (
              <li key={h.id} className="holding-item">
                <div>
                  <strong>{h.symbol}</strong>
                  <span className="muted block">{h.name}</span>
                  <span className="muted small">
                    {h.shares} shares · avg {formatCurrency(h.avgCost)}
                  </span>
                </div>
                <div className="holding-right">
                  <strong>{formatCurrency(h.marketValue)}</strong>
                  <span className={h.gain >= 0 ? "c-gain" : "c-loss"}>
                    {formatSignedCurrency(h.gain)} ({formatPercent(h.gainPercent)})
                  </span>
                  <button
                    type="button"
                    className="icon-btn danger"
                    aria-label={`Remove ${h.symbol}`}
                    onClick={() => removeHoldingAction(h.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <h2 className="section-title">Add holding</h2>
        <form className="form-grid" onSubmit={onAdd}>
          <Field label="Symbol" hint="Stored uppercase; validated client-side.">
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="VOO"
              maxLength={12}
              required
            />
          </Field>
          <Field label="Shares">
            <Input
              type="number"
              min="0.0001"
              step="any"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              required
            />
          </Field>
          <Field label="Average cost">
            <Input
              type="number"
              min="0"
              step="any"
              value={avgCost}
              onChange={(e) => setAvgCost(e.target.value)}
              placeholder="100.00"
              required
            />
          </Field>
          {error ? <p className="form-error">{error}</p> : null}
          <Button type="submit">Add paper position</Button>
        </form>
      </Panel>
    </div>
  );
}
