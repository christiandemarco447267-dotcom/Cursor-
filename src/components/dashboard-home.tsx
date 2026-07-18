"use client";

import Link from "next/link";
import {
  Activity,
  ChevronDown,
  Flame,
  Heart,
  Target,
  FileText,
  BookOpen,
  Brain,
  Compass,
} from "lucide-react";
import { useApp } from "@/lib/app-context";
import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
  greetingForNow,
} from "@/lib/format";
import { xpProgress } from "@/lib/gamification";
import { LESSONS, lessonProgressPercent } from "@/lib/lessons";
import { sparklineForSymbol } from "@/lib/market";
import { Button, Panel, Sparkline } from "@/components/ui";

export function DashboardHome() {
  const { ready, state, summary, market, marketLoading, marketError, refreshMarket } =
    useApp();
  const { intoLevel, needed } = xpProgress(state.gamification.xp);
  const completed = new Set(
    state.lessons.filter((l) => l.completed).map((l) => l.lessonId),
  );
  const learnPct = lessonProgressPercent(completed);
  const checkedInToday = state.checkIns.some(
    (c) => c.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10),
  );
  const streakGoals = 4;
  const maintained =
    (checkedInToday ? 1 : 0) +
    (state.goals.length > 0 ? 1 : 0) +
    (state.theses.length > 0 ? 1 : 0) +
    (completed.size > 0 ? 1 : 0);

  if (!ready) {
    return <div className="loading-block">Loading your workspace…</div>;
  }

  return (
    <div className="stack gap-lg animate-in">
      <div className="dash-top">
        <h1 className="greeting">{greetingForNow()}</h1>
        <div className="status-pills">
          <span className="pill accent">
            <span className="level-dot">{state.gamification.level}</span>
            {state.gamification.xp} XP
          </span>
          <span className="pill warm">
            <Flame size={14} />
            {state.gamification.streak} day streak
          </span>
          <span className="pill">
            <Heart size={14} />
            {state.gamification.health} Health
          </span>
        </div>
      </div>

      <div className="market-bar">
        <Activity size={16} />
        <span>
          {marketLoading
            ? "Loading market data…"
            : marketError
              ? marketError
              : market?.status === "demo"
                ? "Demo market data · stable offline quotes"
                : "Live market data refreshed"}
        </span>
        <button type="button" className="text-link" onClick={() => void refreshMarket()}>
          Refresh
        </button>
      </div>

      <Panel className="hero-value">
        <div className="row between">
          <span className="eyebrow">Portfolio Value</span>
          <span className="cash-chip">Cash {formatCurrency(summary.cash, true)}</span>
        </div>
        <p className="mega-number">{formatCurrency(summary.total)}</p>
        <div className="row gap-sm wrap">
          <span className={summary.gain >= 0 ? "badge gain" : "badge loss"}>
            {formatSignedCurrency(summary.gain)} ({formatPercent(summary.gainPercent)})
          </span>
          <span className="muted">All time · paper portfolio</span>
        </div>
        <Link href="/app/portfolio" className="tap-hint">
          Tap for details <ChevronDown size={14} />
        </Link>
      </Panel>

      <Panel>
        <div className="row between">
          <div className="row gap-sm">
            <span className="icon-tile blue">
              <Target size={16} />
            </span>
            <strong>Today&apos;s Progress</strong>
          </div>
          <Link href="/app/check-in" className="text-link">
            View All →
          </Link>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${(maintained / streakGoals) * 100}%` }}
          />
        </div>
        <p className="muted">
          {maintained} of {streakGoals} streaks maintained
        </p>
        <div className="progress-track thin">
          <div
            className="progress-fill gold"
            style={{ width: `${(intoLevel / needed) * 100}%` }}
          />
        </div>
        <p className="muted small">
          Level {state.gamification.level} · {intoLevel}/{needed} XP
        </p>
      </Panel>

      <div className="tile-grid">
        <Link href="/app/check-in" className="action-tile">
          <Brain size={20} className="c-blue" />
          How are you feeling?
        </Link>
        <Link href="/app/quiz" className="action-tile">
          <Compass size={20} className="c-teal" />
          Discover Your Type
        </Link>
      </div>

      <Link href="/app/goals" className="list-row">
        <span className="icon-tile blue">
          <Target size={16} />
        </span>
        <span>
          <strong>
            {state.goals.length ? "Review your goals" : "Set Your First Goal"}
          </strong>
          <span className="muted block">
            Track progress toward retirement, a house, or vacation
          </span>
        </span>
      </Link>

      <div className="learn-row">
        <BookOpen size={16} />
        <span>Learn</span>
        <span className="pill blue">{learnPct}%</span>
        <Link href="/app/learn" className="text-link ml-auto">
          {LESSONS.length} lessons
        </Link>
      </div>

      <Link href="/app/thesis" className="list-row">
        <span className="icon-tile teal">
          <FileText size={16} />
        </span>
        <span>
          <strong>
            {state.theses.length
              ? `${state.theses.length} theses documented`
              : "Document Your First Thesis"}
          </strong>
          <span className="muted block">
            Track why you bought to make better decisions
          </span>
        </span>
      </Link>

      <Panel className="invest-summary">
        <div>
          <span className="eyebrow">Total Investments</span>
          <p className="big-number">{formatCurrency(summary.investments)}</p>
        </div>
        <Sparkline
          values={sparklineForSymbol("PORT", 28)}
          positive={summary.gain >= 0}
        />
      </Panel>

      <div className="disclaimer-box">
        AInvestPro is an educational paper-trading coach. Market values may use
        demo quotes unless a server-side API key is configured. Nothing here is
        a recommendation to buy or sell securities.
      </div>

      <div className="row gap-sm">
        <Button variant="secondary" onClick={() => void refreshMarket()}>
          Refresh markets
        </Button>
        <Link href="/app/settings" className="btn btn-ghost">
          Data & security
        </Link>
      </div>
    </div>
  );
}
