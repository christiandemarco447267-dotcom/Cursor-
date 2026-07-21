"use client";

import { AppShell } from "@/components/app-shell";
import { useAppState } from "@/hooks/use-app-state";
import { buildInsights } from "@/lib/advice";
import { summarizePortfolio } from "@/lib/portfolio";
import { INVESTOR_TYPES, latestMood, moodGuidance } from "@/lib/investor-type";
import { useMemo } from "react";

export default function InsightsPage() {
  const { state } = useAppState();
  const summary = useMemo(
    () => summarizePortfolio(state.holdings),
    [state.holdings],
  );
  const insights = useMemo(
    () => buildInsights(state, summary),
    [state, summary],
  );
  const mood = latestMood(state.moods);
  const typeMeta =
    state.investorType !== "unspecified"
      ? INVESTOR_TYPES[state.investorType]
      : null;

  return (
    <AppShell title="Rules-based guidance">
      <section className="animate-rise rounded-2xl border border-line bg-ink p-5 text-white">
        <p className="text-sm text-white/70">Current behavioral read</p>
        <p className="mt-2 font-[family-name:var(--font-newsreader)] text-2xl">
          {mood ? mood.mood : "No check-in yet"}
        </p>
        <p className="mt-2 text-sm text-white/75">
          {moodGuidance(mood?.mood)}
        </p>
      </section>

      {typeMeta ? (
        <section className="animate-rise-delay-1 mt-4 rounded-2xl border border-line bg-surface p-4">
          <p className="text-sm text-muted">Investor type</p>
          <h2 className="mt-1 text-xl font-semibold">{typeMeta.label}</h2>
          <p className="mt-2 text-sm text-muted">{typeMeta.summary}</p>
          <p className="mt-2 text-sm text-ink">{typeMeta.focus}</p>
        </section>
      ) : null}

      <section className="animate-rise-delay-2 mt-4 space-y-3">
        {insights.map((insight) => (
          <article
            key={insight.id}
            className="rounded-2xl border border-line bg-surface p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-deep">
              {insight.severity}
            </p>
            <h3 className="mt-1 font-semibold text-ink">{insight.title}</h3>
            <p className="mt-1 text-sm text-muted">{insight.body}</p>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
