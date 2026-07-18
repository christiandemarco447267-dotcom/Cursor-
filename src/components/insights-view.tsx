"use client";

import Link from "next/link";
import { useApp } from "@/lib/app-context";
import { formatCurrency, formatPercent } from "@/lib/format";
import { PageHeader, Panel } from "@/components/ui";

export function InsightsView() {
  const { summary, state } = useApp();
  const top = summary.holdings[0];
  const thesisGap = summary.holdings.filter((h) => {
    return !state.theses.some((t) => t.symbol === h.symbol);
  });

  const cards = [
    {
      title: "Process over prediction",
      body:
        state.gamification.health === "A"
          ? "Your portfolio habits look disciplined — keep documenting theses as you size positions."
          : "Improve health by adding goals, writing theses, and keeping a cash buffer.",
    },
    {
      title: "Concentration check",
      body: top
        ? `${top.symbol} is ${formatPercent((top.marketValue / (summary.total || 1)) * 100)} of total value (${formatCurrency(top.marketValue)}).`
        : "Add holdings to evaluate concentration risk.",
    },
    {
      title: "Thesis coverage",
      body:
        thesisGap.length === 0
          ? "Every holding has a matching thesis symbol — strong process signal."
          : `${thesisGap.length} holding(s) lack a written thesis: ${thesisGap
              .map((h) => h.symbol)
              .slice(0, 5)
              .join(", ")}.`,
    },
    {
      title: "Behavioral cue",
      body:
        state.checkIns[0]?.mood === "fomo" || state.checkIns[0]?.mood === "anxious"
          ? "Your latest check-in suggests elevated emotion. Prefer rules over impulse trades today."
          : "Use a quick mood check-in before changing allocations.",
    },
  ];

  return (
    <div className="stack gap-lg animate-in">
      <PageHeader
        title="Insights"
        subtitle="Rule-based coaching — no model calls, no data leaving your browser."
      />
      <div className="stack gap-md">
        {cards.map((card) => (
          <Panel key={card.title}>
            <h2 className="section-title">{card.title}</h2>
            <p className="body">{card.body}</p>
          </Panel>
        ))}
      </div>
      <div className="tile-grid">
        <Link href="/app/thesis" className="action-tile">
          Write a thesis
        </Link>
        <Link href="/app/check-in" className="action-tile">
          Mood check-in
        </Link>
      </div>
    </div>
  );
}
