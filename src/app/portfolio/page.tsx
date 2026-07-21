"use client";

import { AppShell } from "@/components/app-shell";
import { useAppState } from "@/hooks/use-app-state";
import { formatMoney, formatPercent } from "@/lib/format";
import { holdingCost, holdingValue, summarizePortfolio } from "@/lib/portfolio";
import { upsertTodayStreak } from "@/lib/streaks";
import { useEffect, useMemo } from "react";

export default function PortfolioPage() {
  const { state, update } = useAppState();
  const summary = useMemo(
    () => summarizePortfolio(state.holdings),
    [state.holdings],
  );

  useEffect(() => {
    update((prev) => {
      const already = prev.streaks.some(
        (s) => s.date === new Date().toISOString().slice(0, 10) && s.portfolioReview,
      );
      return {
        ...prev,
        streaks: upsertTodayStreak(prev.streaks, { portfolioReview: true }),
        xp: prev.xp + (already ? 0 : 5),
      };
    });
    // mark once on visit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell title="Holdings & cost basis">
      <section className="animate-rise mb-4 rounded-2xl border border-line bg-surface p-4">
        <p className="text-sm text-muted">Market value</p>
        <p className="mt-1 text-3xl font-semibold">{formatMoney(summary.marketValue)}</p>
        <p className={`mt-2 text-sm font-medium ${summary.gain >= 0 ? "text-gain" : "text-loss"}`}>
          {formatMoney(summary.gain)} ({formatPercent(summary.gainPct)}) vs cost
        </p>
      </section>

      <ul className="animate-rise-delay-1 space-y-3">
        {state.holdings.map((holding) => {
          const value = holdingValue(holding);
          const cost = holdingCost(holding);
          const gain = value - cost;
          const gainPct = cost === 0 ? 0 : gain / cost;
          return (
            <li
              key={holding.id}
              className="rounded-2xl border border-line bg-surface px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{holding.symbol}</p>
                  <p className="text-sm text-muted">{holding.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatMoney(value)}</p>
                  <p className={`text-xs font-medium ${gain >= 0 ? "text-gain" : "text-loss"}`}>
                    {formatPercent(gainPct)}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted">
                <div>
                  <p>Shares</p>
                  <p className="mt-0.5 font-medium text-ink">{holding.shares}</p>
                </div>
                <div>
                  <p>Avg cost</p>
                  <p className="mt-0.5 font-medium text-ink">
                    {formatMoney(holding.avgCost)}
                  </p>
                </div>
                <div>
                  <p>Last</p>
                  <p className="mt-0.5 font-medium text-ink">
                    {formatMoney(holding.lastPrice)}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
