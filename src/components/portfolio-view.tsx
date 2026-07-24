"use client";

import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import { formatCurrency, formatNumber, formatPercent, formatSignedCurrency } from "@/lib/format";
import { realizedPnl } from "@/lib/portfolio";
import { useApp } from "@/lib/store";
import { EmptyState, Loading, Panel, PageHeader, Sparkline, Stat } from "./ui";

export function PortfolioView() {
  const { ready, state, summary, actions } = useApp();
  if (!ready || !state || !summary) return <Loading />;

  const realized = realizedPnl(state);

  return (
    <div className="stack gap-lg animate-in">
      <PageHeader
        title="Portfolio"
        subtitle="Your simulated positions, valued with the latest quotes."
        action={
          <Link href="/app/trade" className="btn btn-primary">
            <ArrowLeftRight size={16} /> Trade
          </Link>
        }
      />

      <div className="grid grid-4">
        <Stat label="Total value" value={formatCurrency(summary.total)} />
        <Stat label="Invested" value={formatCurrency(summary.investments)} />
        <Stat label="Cash" value={formatCurrency(summary.cash)} />
        <Stat
          label="All-time P/L"
          value={`${formatSignedCurrency(summary.gain)}`}
          hint={formatPercent(summary.gainPercent, true)}
          tone={summary.gain >= 0 ? "gain" : "loss"}
        />
      </div>

      <Panel>
        <div className="row between" style={{ marginBottom: 8 }}>
          <strong>Holdings</strong>
          <span className="small muted">Realized P/L {formatSignedCurrency(realized)}</span>
        </div>
        {summary.holdings.length === 0 ? (
          <EmptyState title="No positions yet" hint="Head to Trade to buy your first paper position." />
        ) : (
          <div className="list">
            {summary.holdings.map((holding) => {
              const linkedThesis = state.theses.find((t) => t.id === holding.thesisId);
              return (
                <div key={holding.id} className="list-row">
                  <span className="sym-badge">{holding.symbol.slice(0, 4)}</span>
                  <div className="grow stack" style={{ gap: 2 }}>
                    <div className="row between wrap gap-sm">
                      <strong>{holding.symbol}</strong>
                      <span className="value-lg">{formatCurrency(holding.marketValue)}</span>
                    </div>
                    <div className="row between wrap gap-sm">
                      <span className="small muted">
                        {formatNumber(holding.shares)} sh · avg {formatCurrency(holding.avgCost)}
                        {!holding.hasQuote ? " · quote pending" : ""}
                      </span>
                      <span className={`small ${holding.gain >= 0 ? "gain" : "loss"}`}>
                        {formatSignedCurrency(holding.gain)} ({formatPercent(holding.gainPercent, true)})
                      </span>
                    </div>
                    <div className="row between wrap gap-sm" style={{ marginTop: 6 }}>
                      <select
                        className="select"
                        style={{ maxWidth: 220 }}
                        aria-label={`Link a thesis to ${holding.symbol}`}
                        value={holding.thesisId ?? ""}
                        onChange={(e) => actions.linkHoldingToThesis(holding.id, e.target.value || undefined)}
                      >
                        <option value="">No thesis linked</option>
                        {state.theses.map((thesis) => (
                          <option key={thesis.id} value={thesis.id}>
                            {thesis.symbol} · {thesis.title}
                          </option>
                        ))}
                      </select>
                      <Link href={`/app/trade?symbol=${encodeURIComponent(holding.symbol)}`} className="btn btn-sm">
                        Trade
                      </Link>
                    </div>
                    {linkedThesis ? <span className="small dim">Thesis: {linkedThesis.title}</span> : null}
                  </div>
                  <Sparkline symbol={holding.symbol} />
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
