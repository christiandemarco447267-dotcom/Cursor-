"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Compass,
  Flame,
  GraduationCap,
  HeartPulse,
  Lightbulb,
  RefreshCw,
  Target,
} from "lucide-react";
import { formatCurrency, formatPercent, formatSignedCurrency } from "@/lib/format";
import { lessonProgressPercent } from "@/lib/lessons";
import { realizedPnl } from "@/lib/portfolio";
import { xpProgress } from "@/lib/gamification";
import { useApp } from "@/lib/store";
import { Loading, Panel, ProgressBar } from "./ui";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function marketLabel(status: string): string {
  switch (status) {
    case "loading":
      return "Loading market…";
    case "open":
      return "Live · market open";
    case "closed":
      return "Live · market closed";
    case "demo":
      return "Demo prices";
    case "error":
      return "Market unavailable";
    default:
      return status;
  }
}

export function DashboardHome() {
  const { ready, state, summary, market, refreshMarket, actions } = useApp();
  const [nameInput, setNameInput] = useState("");
  if (!ready || !state || !summary) return <Loading />;

  const { gamification } = state;
  const progress = xpProgress(gamification.xp);
  const lessonPercent = lessonProgressPercent(state.lessons.map((l) => l.lessonId));
  const realized = realizedPnl(state);
  const firstName = state.profileName.split(" ")[0];

  const saveName = (event: React.FormEvent) => {
    event.preventDefault();
    if (nameInput.trim()) actions.setProfileName(nameInput);
  };

  return (
    <div className="stack gap-lg animate-in">
      <div className="row between wrap gap-md">
        <div className="stack gap-sm">
          <span className="eyebrow">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
          </span>
          <h1 style={{ fontSize: "2rem" }}>
            {firstName ? `Welcome back, ${firstName}` : "Your investing workspace"}
          </h1>
        </div>
        <div className="row wrap gap-sm">
          <span className="pill pill-primary">
            <Award size={15} /> Level {gamification.level}
          </span>
          <span className="pill">{gamification.xp} XP</span>
          <span className="pill pill-accent">
            <Flame size={15} /> {gamification.streak}-day streak
          </span>
          <span className="pill">Health {gamification.health}</span>
        </div>
      </div>

      {!firstName ? (
        <Panel className="row between wrap gap-md">
          <div className="stack" style={{ gap: 2 }}>
            <strong>Make it yours</strong>
            <span className="small muted">Add your name so Sentia can greet you.</span>
          </div>
          <form className="row gap-sm" onSubmit={saveName}>
            <input
              className="input"
              style={{ maxWidth: 200 }}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your name"
              maxLength={40}
              aria-label="Your name"
            />
            <button className="btn btn-primary btn-sm" type="submit" disabled={!nameInput.trim()}>
              Save
            </button>
          </form>
        </Panel>
      ) : null}

      <div className="row between wrap gap-sm">
        <span className={`pill ${market.status === "error" ? "" : "pill-primary"}`}>{marketLabel(market.status)}</span>
        <button className="btn btn-sm" onClick={refreshMarket}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <Panel strong className="panel-pad-lg hero-balance holo stack gap-md">
        <span className="eyebrow">Total portfolio value</span>
        <div className="row between wrap gap-md">
          <span className="value-xl">{formatCurrency(summary.total)}</span>
          <span className={`badge ${summary.gain >= 0 ? "badge-gain" : "badge-loss"}`}>
            {summary.gain >= 0 ? <ArrowUpRight size={16} /> : null}
            {formatSignedCurrency(summary.gain)} ({formatPercent(summary.gainPercent, true)})
          </span>
        </div>
        <div className="row wrap gap-md">
          <span className="pill">Cash {formatCurrency(summary.cash)}</span>
          <span className="pill">Invested {formatCurrency(summary.investments)}</span>
          <span className="pill">Realized P/L {formatSignedCurrency(realized)}</span>
        </div>
        <Link href="/app/portfolio" className="btn btn-primary" style={{ width: "fit-content" }}>
          View portfolio <ArrowRight size={16} />
        </Link>
      </Panel>

      <Panel className="stack gap-sm">
        <div className="row between">
          <strong>Progress to level {gamification.level + 1}</strong>
          <span className="small muted">
            {progress.intoLevel}/{progress.needed} XP
          </span>
        </div>
        <ProgressBar percent={(progress.intoLevel / progress.needed) * 100} />
        <span className="small muted">Longest streak: {gamification.longestStreak} days</span>
      </Panel>

      <div className="grid grid-2">
        <QuickLink href="/app/trade" icon={<ArrowUpRight size={18} />} title="Trade" body="Buy or sell against your cash balance." />
        <QuickLink href="/app/check-in" icon={<HeartPulse size={18} />} title="Daily check-in" body="Log how you feel before you act." />
        <QuickLink href="/app/quiz" icon={<Compass size={18} />} title="Discover your type" body="A quick, unscored investor-style quiz." />
        <QuickLink
          href="/app/insights"
          icon={<Lightbulb size={18} />}
          title="Insights"
          body="Coaching tuned to your current process."
        />
      </div>

      <Panel className="stack gap-md">
        <RowLink href="/app/goals" icon={<Target size={18} />} title="Goals" hint={`${state.goals.length} set`} />
        <RowLink
          href="/app/learn"
          icon={<GraduationCap size={18} />}
          title="Learn"
          hint={`${lessonPercent}% complete`}
        />
        <RowLink href="/app/thesis" icon={<Lightbulb size={18} />} title="Theses" hint={`${state.theses.length} written`} />
      </Panel>

      <p className="disclaimer">
        Educational paper-trading only. Not investment advice. Data stays in your browser and is validated before every
        save.
      </p>
    </div>
  );
}

function QuickLink({ href, icon, title, body }: { href: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <Link href={href} className="panel holo stack gap-sm">
      <span className="trust-icon">{icon}</span>
      <strong>{title}</strong>
      <span className="small muted">{body}</span>
    </Link>
  );
}

function RowLink({ href, icon, title, hint }: { href: string; icon: React.ReactNode; title: string; hint: string }) {
  return (
    <Link href={href} className="row between" style={{ padding: "6px 0" }}>
      <span className="row gap-sm">
        <span className="trust-icon" style={{ width: 34, height: 34 }}>
          {icon}
        </span>
        <strong>{title}</strong>
      </span>
      <span className="row gap-sm muted small">
        {hint} <ArrowRight size={16} />
      </span>
    </Link>
  );
}
