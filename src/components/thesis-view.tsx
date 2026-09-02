"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { nameForSymbol } from "@/lib/market";
import { quoteMap } from "@/lib/portfolio";
import { useApp } from "@/lib/store";
import { isValidSymbol, normalizeSymbol } from "@/lib/validation";
import { EmptyState, Loading, Panel, PageHeader } from "./ui";

export function ThesisView() {
  const { ready, state, quotes, actions } = useApp();
  const prices = useMemo(() => quoteMap(quotes), [quotes]);
  const [symbol, setSymbol] = useState("");
  const [title, setTitle] = useState("");
  const [rationale, setRationale] = useState("");
  const [risks, setRisks] = useState("");
  const [conviction, setConviction] = useState(3);
  const [error, setError] = useState("");

  if (!ready || !state) return <Loading />;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!isValidSymbol(symbol)) return setError("Enter a valid ticker symbol.");
    if (!title.trim()) return setError("Give your thesis a title.");
    if (!rationale.trim()) return setError("Add your rationale.");

    actions.addThesis({ symbol: normalizeSymbol(symbol), title, rationale, risks, conviction });
    setSymbol("");
    setTitle("");
    setRationale("");
    setRisks("");
    setConviction(3);
  };

  return (
    <div className="stack gap-lg animate-in">
      <PageHeader title="Investment theses" subtitle="Write down why you own each position. Future-you will thank you." />

      {state.theses.length === 0 ? (
        <EmptyState title="No theses yet" hint="Document your first investment idea below." />
      ) : (
        <div className="stack gap-md">
          {state.theses.map((thesis) => {
            const symbol = normalizeSymbol(thesis.symbol);
            const linked = state.holdings.some((h) => h.thesisId === thesis.id);
            const quote = prices.get(symbol);
            const change = quote?.changePercent ?? 0;
            return (
              <Panel key={thesis.id} className="stack gap-sm">
                <div className="row between wrap gap-sm">
                  <div className="row gap-sm">
                    <span className="sym-badge">{thesis.symbol.slice(0, 4)}</span>
                    <div className="stack" style={{ gap: 2 }}>
                      <strong>{thesis.title}</strong>
                      <span className="small dim">
                        {thesis.symbol} · {nameForSymbol(symbol)} · conviction {thesis.conviction}/5 · {formatDate(thesis.createdAt)}
                        {linked ? " · linked" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="row gap-sm" style={{ alignItems: "center" }}>
                    <div className="stack" style={{ alignItems: "flex-end", gap: 2 }} aria-label={`Live quote for ${symbol}`}>
                      <strong>{quote ? formatCurrency(quote.price) : "—"}</strong>
                      <span className={`small ${quote ? (change >= 0 ? "gain" : "loss") : "dim"}`}>
                        {quote ? formatPercent(change, true) : "no quote"}
                      </span>
                    </div>
                    <button className="btn btn-sm btn-danger btn-icon" onClick={() => actions.removeThesis(thesis.id)} aria-label="Delete thesis">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="muted small">{thesis.rationale}</p>
                {thesis.risks ? <p className="small dim">Risks / invalidation: {thesis.risks}</p> : null}
              </Panel>
            );
          })}
        </div>
      )}

      <Panel strong className="stack gap-md">
        <strong>New thesis</strong>
        <form className="stack gap-md" onSubmit={submit}>
          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="thesis-symbol">Symbol</label>
              <input id="thesis-symbol" className="input" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} maxLength={12} placeholder="AAPL" />
            </div>
            <div className="field">
              <label htmlFor="thesis-conviction">Conviction: {conviction}/5</label>
              <input id="thesis-conviction" type="range" min={1} max={5} value={conviction} onChange={(e) => setConviction(Number(e.target.value))} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="thesis-title">Title</label>
            <input id="thesis-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Durable compounder at a fair price" />
          </div>
          <div className="field">
            <label htmlFor="thesis-rationale">Rationale</label>
            <textarea id="thesis-rationale" className="textarea" value={rationale} onChange={(e) => setRationale(e.target.value)} maxLength={4000} placeholder="Why do you own this? What's the edge?" />
          </div>
          <div className="field">
            <label htmlFor="thesis-risks">Risks / what would prove you wrong (optional)</label>
            <textarea id="thesis-risks" className="textarea" value={risks} onChange={(e) => setRisks(e.target.value)} maxLength={2000} />
          </div>
          {error ? <span className="form-error">{error}</span> : null}
          <button type="submit" className="btn btn-primary" style={{ width: "fit-content" }}>
            Save thesis
          </button>
        </form>
      </Panel>
    </div>
  );
}
