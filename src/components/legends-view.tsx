"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Landmark } from "lucide-react";
import { LEGEND_PORTFOLIOS } from "@/data/legends";
import { compareWithLegend } from "@/lib/legends";
import { useApp } from "@/lib/store";
import { EmptyState, Loading, Panel, PageHeader } from "./ui";

export function LegendsView() {
  const { ready, summary } = useApp();
  const [id, setId] = useState(LEGEND_PORTFOLIOS[0].id);
  const legend = LEGEND_PORTFOLIOS.find((l) => l.id === id) ?? LEGEND_PORTFOLIOS[0];
  const comparison = useMemo(
    () => (summary ? compareWithLegend(summary.holdings.map((h) => ({ symbol: h.symbol, value: h.marketValue })), legend) : null),
    [summary, legend],
  );

  if (!ready || !summary || !comparison) return <Loading />;
  const hasHoldings = summary.holdings.length > 0;

  return (
    <div className="stack gap-lg animate-in">
      <PageHeader title="Legend portfolios" subtitle="See how your book compares with famous and textbook portfolios." />

      <div className="segmented" role="group" aria-label="Legend portfolio">
        {LEGEND_PORTFOLIOS.map((l) => (
          <button key={l.id} type="button" className={l.id === id ? "active" : ""} aria-pressed={l.id === id} onClick={() => setId(l.id)}>
            {l.name}
          </button>
        ))}
      </div>

      <Panel strong className="holo stack gap-md">
        <div className="row between wrap gap-sm">
          <strong className="row gap-sm">
            <Landmark size={18} /> {legend.name}
          </strong>
          <span className={`pill ${legend.kind === "13F" ? "pill-primary" : "pill-accent"}`}>
            {legend.kind === "13F" ? "Real 13F filing" : "Model portfolio"} · as of {legend.asOf}
          </span>
        </div>
        <span className="muted small">{legend.description}</span>
        <div className="bench-stats bench-stats-4">
          <Mini label="Overlap with you" value={hasHoldings ? `${comparison.overlapPct.toFixed(0)}%` : "—"} hint="Σ of the smaller weight per shared stock" />
          <Mini label="Shared holdings" value={String(comparison.shared.length)} hint={comparison.shared.map((s) => s.symbol).join(", ") || "None"} />
          <Mini label="Top position" value={`You ${comparison.you.top1.toFixed(0)}% · ${comparison.legend.top1.toFixed(0)}%`} hint="Largest single weight" />
          <Mini
            label="Effective # holdings"
            value={`You ${comparison.you.effectiveHoldings.toFixed(1)} · ${comparison.legend.effectiveHoldings.toFixed(1)}`}
            hint="1 / Σ weight² — lower = more concentrated"
          />
        </div>
      </Panel>

      <div className="grid grid-2">
        <Panel className="stack gap-md">
          <strong>Sector mix</strong>
          {!hasHoldings ? (
            <EmptyState title="No holdings to compare" hint="Buy a few positions, then come back." />
          ) : (
            <div className="stack gap-sm">
              <div className="compare-bar small dim">
                <span />
                <span>You</span>
                <span>{legend.name.replace(" (model)", "")}</span>
              </div>
              {comparison.sectors.slice(0, 9).map((row) => (
                <div key={row.sector} className="compare-bar small">
                  <span className="truncate" title={row.sector}>
                    {row.sector}
                  </span>
                  <span className="row gap-sm" title={`You: ${row.you.toFixed(1)}%`}>
                    <span className="hbar hbar-you grow">
                      <span style={{ width: `${row.you}%` }} />
                    </span>
                    <span style={{ minWidth: 34, textAlign: "right" }}>{row.you.toFixed(0)}%</span>
                  </span>
                  <span className="row gap-sm" title={`${legend.name}: ${row.legend.toFixed(1)}%`}>
                    <span className="hbar hbar-legend grow">
                      <span style={{ width: `${row.legend}%` }} />
                    </span>
                    <span style={{ minWidth: 34, textAlign: "right" }}>{row.legend.toFixed(0)}%</span>
                  </span>
                </div>
              ))}
              <span className="small dim">Your weights exclude cash. Broad funds are shown as their own fund type.</span>
            </div>
          )}
        </Panel>

        <Panel className="stack gap-md">
          <strong>Holdings by weight</strong>
          <div className="list">
            {legend.holdings.map((h) => {
              const shared = comparison.shared.some((s) => s.symbol === h.symbol || (h.symbol === "GOOG" && s.symbol === "GOOGL"));
              return (
                <div key={h.symbol} className="list-row" style={{ padding: "8px 0" }}>
                  <span className="sym-badge" style={{ width: 52, fontSize: 12 }}>
                    {h.symbol}
                  </span>
                  <span className="grow small truncate">{h.name}</span>
                  {shared ? <span className="pill pill-primary pill-compact">You own</span> : null}
                  <strong className="small">{h.weight.toFixed(2)}%</strong>
                </div>
              );
            })}
            {legend.otherWeight > 0 ? (
              <div className="list-row small dim" style={{ padding: "8px 0" }}>
                <span className="grow">All other positions</span>
                <span>{legend.otherWeight.toFixed(2)}%</span>
              </div>
            ) : null}
          </div>
        </Panel>
      </div>

      <p className="disclaimer">
        {legend.asOfLabel}. Source: {legend.source}
        {legend.sourceUrl ? (
          <>
            {" "}
            (
            <a href={legend.sourceUrl} target="_blank" rel="noreferrer" className="row gap-sm" style={{ display: "inline-flex", gap: 4 }}>
              SEC filing <ExternalLink size={12} />
            </a>
            )
          </>
        ) : null}
        . 13F filings show US-listed long equity positions only, ~45 days after quarter end; weights are share of reported 13F
        value. For comparison and education only — not a recommendation to buy or sell anything.
      </p>
    </div>
  );
}

function Mini({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bench-stat stack" style={{ gap: 2 }}>
      <span className="eyebrow">{label}</span>
      <strong className="value-lg">{value}</strong>
      {hint ? <span className="small dim">{hint}</span> : null}
    </div>
  );
}
