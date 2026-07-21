"use client";

import { AppShell } from "@/components/app-shell";
import { useAppState } from "@/hooks/use-app-state";
import { formatMoney, formatPercent } from "@/lib/format";
import { summarizePortfolio } from "@/lib/portfolio";
import { useMemo } from "react";

const labels: Record<string, string> = {
  equity: "Equities",
  etf: "ETFs",
  cash: "Cash",
  crypto: "Crypto",
};

export default function AnalyticsPage() {
  const { state } = useAppState();
  const summary = useMemo(
    () => summarizePortfolio(state.holdings),
    [state.holdings],
  );

  return (
    <AppShell title="Allocation & exposure">
      <section className="animate-rise rounded-2xl border border-line bg-surface p-4">
        <h1 className="font-[family-name:var(--font-newsreader)] text-2xl text-ink">
          Portfolio mix
        </h1>
        <p className="mt-1 text-sm text-muted">
          Weights update from your local holdings and refreshed quotes.
        </p>

        <ul className="mt-5 space-y-4">
          {summary.allocation.map((slice) => (
            <li key={slice.assetClass}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-ink">
                  {labels[slice.assetClass] ?? slice.assetClass}
                </span>
                <span className="text-muted">
                  {formatMoney(slice.value)} · {formatPercent(slice.weight)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-lg bg-paper">
                <div
                  className="animate-fill-bar h-full rounded-lg bg-teal"
                  style={{ width: `${Math.round(slice.weight * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="animate-rise-delay-1 mt-4 rounded-2xl border border-line bg-surface p-4">
        <h2 className="font-semibold text-ink">Cost basis check</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted">Market value</dt>
            <dd className="mt-1 font-semibold">{formatMoney(summary.marketValue)}</dd>
          </div>
          <div>
            <dt className="text-muted">Cost basis</dt>
            <dd className="mt-1 font-semibold">{formatMoney(summary.costBasis)}</dd>
          </div>
          <div>
            <dt className="text-muted">Unrealized gain</dt>
            <dd className={`mt-1 font-semibold ${summary.gain >= 0 ? "text-gain" : "text-loss"}`}>
              {formatMoney(summary.gain)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Return</dt>
            <dd className={`mt-1 font-semibold ${summary.gainPct >= 0 ? "text-gain" : "text-loss"}`}>
              {formatPercent(summary.gainPct)}
            </dd>
          </div>
        </dl>
      </section>
    </AppShell>
  );
}
