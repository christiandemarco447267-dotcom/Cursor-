"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MarketStatus } from "@/components/market-status";
import { StatChip } from "@/components/stat-chip";
import {
  IconArrowUp,
  IconBook,
  IconBrain,
  IconDoc,
  IconFlame,
  IconHeart,
  IconTarget,
} from "@/components/icons";
import { useAppState } from "@/hooks/use-app-state";
import { buildInsights } from "@/lib/advice";
import {
  formatMoney,
  formatPercent,
  greetingFor,
} from "@/lib/format";
import {
  applyQuotePrices,
  primaryGoalProgress,
  summarizePortfolio,
} from "@/lib/portfolio";
import { computeStreakStats, upsertTodayStreak } from "@/lib/streaks";
import { INVESTOR_TYPES } from "@/lib/investor-type";

export function HomeDashboard() {
  const { state, update } = useAppState();
  const [quoteSource, setQuoteSource] = useState<"live" | "demo" | null>(null);
  const [loadingQuotes, setLoadingQuotes] = useState(true);
  const symbolKey = state.holdings.map((h) => h.symbol).join(",");

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      setLoadingQuotes(true);
      const symbols = symbolKey
        .split(",")
        .filter((symbol) => symbol && symbol !== "USD")
        .join(",");
      try {
        const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(symbols)}`);
        if (!res.ok) throw new Error("quote fail");
        const data = (await res.json()) as {
          quotes: Record<string, number>;
          source: "live" | "demo";
        };
        if (cancelled) return;
        setQuoteSource(data.source);
        update((prev) => ({
          ...prev,
          holdings: applyQuotePrices(prev.holdings, data.quotes),
          streaks: upsertTodayStreak(prev.streaks, { portfolioReview: true }),
        }));
      } catch {
        if (!cancelled) setQuoteSource("demo");
      } finally {
        if (!cancelled) setLoadingQuotes(false);
      }
    }

    void refresh();
    return () => {
      cancelled = true;
    };
  }, [symbolKey, update]);

  const summary = useMemo(
    () => summarizePortfolio(state.holdings),
    [state.holdings],
  );
  const streak = useMemo(
    () => computeStreakStats(state.streaks),
    [state.streaks],
  );
  const { goal, progress } = useMemo(
    () => primaryGoalProgress(state.goals, summary.marketValue),
    [state.goals, summary.marketValue],
  );
  const learnPct = useMemo(() => {
    if (state.learn.length === 0) return 0;
    return state.learn.filter((m) => m.completed).length / state.learn.length;
  }, [state.learn]);
  const insights = useMemo(
    () => buildInsights(state, summary),
    [state, summary],
  );
  const typeMeta =
    state.investorType !== "unspecified"
      ? INVESTOR_TYPES[state.investorType]
      : null;

  return (
    <div className="space-y-4">
      <section className="animate-rise">
        <h1
          suppressHydrationWarning
          className="font-[family-name:var(--font-newsreader)] text-3xl text-ink"
        >
          {greetingFor()}
        </h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatChip icon={<span className="text-[10px] font-bold">XP</span>} label={`${state.xp} XP`} />
          <StatChip
            icon={<IconFlame className="h-3.5 w-3.5" />}
            label={`${streak.currentStreak} day streak`}
            tone={streak.currentStreak > 0 ? "gain" : "default"}
          />
          <StatChip
            icon={<IconHeart className="h-3.5 w-3.5" />}
            label={`${streak.health} Health`}
            tone={streak.health === "A" || streak.health === "B" ? "gain" : "warn"}
          />
        </div>
      </section>

      <div className="animate-rise-delay-1">
        <MarketStatus loading={loadingQuotes} source={quoteSource} />
      </div>

      <section className="animate-rise-delay-1 relative overflow-hidden rounded-2xl bg-ink text-white shadow-[0_24px_50px_rgba(12,27,42,0.28)]">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, rgba(20,184,166,0.45), transparent 40%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.18), transparent 35%), linear-gradient(135deg, #0c1b2a, #143248 60%, #0f766e)",
          }}
        />
        <div className="relative p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-white/70">Portfolio value</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">
                {formatMoney(summary.marketValue)}
              </p>
            </div>
            {goal ? (
              <Link
                href="/goals"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-2.5 py-1.5 text-xs font-medium backdrop-blur"
              >
                <IconTarget className="h-3.5 w-3.5" />
                {formatMoney(goal.targetAmount)}
              </Link>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1 rounded-xl bg-gain/20 px-2.5 py-1 font-medium text-emerald-200">
              <IconArrowUp className="h-3.5 w-3.5" />
              {formatMoney(summary.gain)} ({formatPercent(summary.gainPct)})
            </span>
            <span className="text-white/60">All time</span>
          </div>
          <div className="mt-5 border-t border-white/15 pt-3">
            <div className="mb-1 flex justify-between text-xs text-white/70">
              <span>Goal progress</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-lg bg-white/15">
              <div
                className="animate-fill-bar h-full rounded-lg bg-teal"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="animate-rise-delay-2 rounded-2xl border border-line bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium text-ink">
            <IconTarget className="h-4 w-4 text-teal" />
            Today&apos;s progress
          </div>
          <span className="text-xs text-muted">
            {streak.maintainedToday} of {streak.totalDaily} habits
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-lg bg-paper">
          <div
            className="animate-fill-bar h-full rounded-lg bg-teal"
            style={{
              width: `${(streak.maintainedToday / streak.totalDaily) * 100}%`,
            }}
          />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link
          href="/mood"
          className="rounded-2xl border border-line bg-surface px-3 py-4 text-sm font-medium text-ink transition hover:border-teal/40"
        >
          <IconBrain className="mb-2 h-5 w-5 text-teal" />
          How are you feeling?
        </Link>
        <Link
          href="/type"
          className="rounded-2xl border border-line bg-ink-soft px-3 py-4 text-sm font-medium text-white transition hover:bg-ink"
        >
          <IconBrain className="mb-2 h-5 w-5 text-teal" />
          {typeMeta ? typeMeta.label : "Discover your type"}
        </Link>
      </section>

      <section className="space-y-3">
        {state.goals.length === 0 ? (
          <ActionRow
            href="/goals"
            icon={<IconTarget className="h-5 w-5" />}
            title="Set your first goal"
            body="Track progress toward retirement, a house, or vacation"
          />
        ) : (
          <ActionRow
            href="/goals"
            icon={<IconTarget className="h-5 w-5" />}
            title={state.goals[0].title}
            body={`${formatMoney(Math.max(state.goals[0].currentAmount, summary.marketValue))} of ${formatMoney(state.goals[0].targetAmount)}`}
          />
        )}

        <Link
          href="/learn"
          className="flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3"
        >
          <span className="inline-flex items-center gap-2 font-medium">
            <IconBook className="h-4 w-4 text-teal" />
            Learn
          </span>
          <span className="rounded-lg bg-teal/10 px-2 py-0.5 text-xs font-semibold text-teal-deep">
            {Math.round(learnPct * 100)}%
          </span>
        </Link>

        {state.theses.length === 0 ? (
          <ActionRow
            href="/thesis/new"
            icon={<IconDoc className="h-5 w-5" />}
            title="Document your first thesis"
            body="Track why you bought to make better decisions"
          />
        ) : (
          <ActionRow
            href="/thesis"
            icon={<IconDoc className="h-5 w-5" />}
            title={`${state.theses.length} thesis note${state.theses.length === 1 ? "" : "s"}`}
            body="Review convictions before you trade"
          />
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">Total investments</p>
            <p className="mt-1 text-2xl font-semibold text-ink">
              {formatMoney(summary.marketValue)}
            </p>
          </div>
          <Sparkline positive={summary.gain >= 0} />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="mb-3 font-semibold text-ink">Priority insights</h2>
        <ul className="space-y-3">
          {insights.map((insight) => (
            <li key={insight.id} className="border-t border-line/80 pt-3 first:border-0 first:pt-0">
              <p className="text-sm font-medium text-ink">{insight.title}</p>
              <p className="mt-1 text-sm text-muted">{insight.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ActionRow({
  href,
  icon,
  title,
  body,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-4 transition hover:border-teal/40"
    >
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-teal/10 text-teal-deep">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-ink">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{body}</span>
      </span>
      <span className="text-muted">›</span>
    </Link>
  );
}

function Sparkline({ positive }: { positive: boolean }) {
  return (
    <svg width="88" height="40" viewBox="0 0 88 40" aria-hidden>
      <path
        d="M2 30 C 16 28, 22 18, 34 16 S 52 22, 62 12 S 78 8, 86 6"
        fill="none"
        stroke={positive ? "var(--gain)" : "var(--loss)"}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M2 30 C 16 28, 22 18, 34 16 S 52 22, 62 12 S 78 8, 86 6 V 40 H 2 Z"
        fill={positive ? "rgba(11,122,75,0.12)" : "rgba(180,35,24,0.12)"}
      />
    </svg>
  );
}
