// Discipline Score (0–100): a process score, not a performance score. Five equally
// weighted parts reward habits — documented reasons, sane sizing, diversification,
// avoiding behavioural biases and using risk tools (pure; unit-tested).
import { biasReport, type BiasReport } from "./biases";
import type { PortfolioSummary } from "./portfolio";
import { BROAD_FUND_SECTORS, sectorOf } from "./sectors";
import type { AppState } from "./types";
import { normalizeSymbol } from "./validation";

export const DISCIPLINE_RULES = {
  /** Positions at or below this share of the total portfolio get full sizing credit. */
  maxPositionPct: 25,
  /** …and no sizing credit at or above this share. */
  zeroCreditPositionPct: 50,
  /** Holdings for full "number of positions" credit. */
  targetHoldings: 5,
  /** Diversification units for full sector credit (a broad fund counts as 2). */
  targetSectorUnits: 4,
} as const;

export const DISCIPLINE_MILESTONES = [60, 75, 90] as const;

export type DisciplineKey = "thesis" | "sizing" | "diversification" | "biases" | "riskTools";

export type DisciplinePart = {
  key: DisciplineKey;
  label: string;
  points: number;
  max: number;
  detail: string;
  tip: string;
};

export type DisciplineScore = {
  score: number;
  grade: string;
  parts: DisciplinePart[];
  bias: BiasReport;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const r1 = (v: number) => Math.round(v * 10) / 10;

export function gradeFor(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 50) return "Building";
  return "Needs work";
}

/** Highest milestone at or below the score (0 when none reached). */
export function milestoneFor(score: number): number {
  let reached = 0;
  for (const m of DISCIPLINE_MILESTONES) if (score >= m) reached = m;
  return reached;
}

/** Symbols that have a protective tool: an active price alert, an open sell stop, or a stress-test exit price. */
export function protectedSymbols(state: AppState): Set<string> {
  const out = new Set<string>();
  for (const a of state.alerts) if (a.status === "active") out.add(normalizeSymbol(a.symbol));
  for (const o of state.orders) if (o.status === "open" && o.side === "sell" && o.type === "stop") out.add(normalizeSymbol(o.symbol));
  for (const t of state.theses) if (t.stressTest?.exitPrice) out.add(normalizeSymbol(t.symbol));
  return out;
}

export function disciplineScore(state: AppState, summary: PortfolioSummary, now: number = Date.now()): DisciplineScore {
  const holdings = summary.holdings.filter((h) => h.shares > 0);
  const n = holdings.length;
  const parts: DisciplinePart[] = [];

  // 1. Thesis coverage
  const covered = holdings.filter((h) => h.thesisId).length;
  const thesisRatio = n ? covered / n : 1;
  parts.push({
    key: "thesis",
    label: "Thesis coverage",
    points: r1(20 * thesisRatio),
    max: 20,
    detail: n ? `${covered} of ${n} holdings have a written thesis.` : "No holdings yet, so nothing is undocumented.",
    tip: "Link every position to a thesis so you know why you own it.",
  });

  // 2. Position sizing
  const total = Math.max(summary.total, 1e-9);
  const weights = holdings.map((h) => ({ symbol: h.symbol, pct: (h.marketValue / total) * 100 }));
  const largest = weights.reduce((m, w) => (w.pct > m.pct ? w : m), { symbol: "", pct: 0 });
  const { maxPositionPct: cap, zeroCreditPositionPct: zero } = DISCIPLINE_RULES;
  const sizingRatio = largest.pct <= cap ? 1 : clamp01((zero - largest.pct) / (zero - cap));
  const oversized = weights.filter((w) => w.pct > cap).length;
  parts.push({
    key: "sizing",
    label: "Position sizing",
    points: r1(20 * sizingRatio),
    max: 20,
    detail: n
      ? `Largest position: ${largest.symbol} at ${largest.pct.toFixed(0)}% of the portfolio${oversized ? ` (${oversized} above ${cap}%)` : ""}.`
      : "No positions to size yet.",
    tip: `Keep any single position at or below about ${cap}% of your portfolio.`,
  });

  // 3. Diversification
  const sectors = new Set(holdings.map((h) => sectorOf(h.symbol)));
  let units = 0;
  for (const s of sectors) units += BROAD_FUND_SECTORS.includes(s) ? 2 : 1;
  const divRatio = n
    ? 0.5 * clamp01(n / DISCIPLINE_RULES.targetHoldings) + 0.5 * clamp01(units / DISCIPLINE_RULES.targetSectorUnits)
    : 0;
  parts.push({
    key: "diversification",
    label: "Diversification",
    points: r1(20 * divRatio),
    max: 20,
    detail: n ? `${n} holding${n === 1 ? "" : "s"} across ${sectors.size} sector${sectors.size === 1 ? "" : "s"} or fund type${sectors.size === 1 ? "" : "s"}.` : "All cash — no diversification yet.",
    tip: "Spread across several holdings and sectors; broad index funds count extra.",
  });

  // 4. Biases avoided (last 30 days)
  const bias = biasReport(state.transactions, now, 30);
  const biasRatio = bias.trades ? clamp01(1 - bias.total / bias.trades) : 1;
  parts.push({
    key: "biases",
    label: "Biases avoided",
    points: r1(20 * biasRatio),
    max: 20,
    detail: bias.trades
      ? `${bias.total} bias flag${bias.total === 1 ? "" : "s"} across ${bias.trades} trade${bias.trades === 1 ? "" : "s"} in the last 30 days.`
      : "No trades in the last 30 days.",
    tip: "Slow down after losses and big moves; trade the plan, not the feeling.",
  });

  // 5. Risk tools: alerts, stop orders, stress-test exits
  const guarded = protectedSymbols(state);
  const guardedCount = holdings.filter((h) => guarded.has(normalizeSymbol(h.symbol))).length;
  const riskRatio = n ? guardedCount / n : 1;
  parts.push({
    key: "riskTools",
    label: "Alerts & stops",
    points: r1(20 * riskRatio),
    max: 20,
    detail: n ? `${guardedCount} of ${n} holdings have a price alert, stop order or stress-test exit.` : "No positions to protect yet.",
    tip: "Set a price alert or stop for each holding, or stress-test its thesis with an exit price.",
  });

  const score = Math.round(parts.reduce((s, p) => s + p.points, 0));
  return { score: Math.max(0, Math.min(100, score)), grade: gradeFor(score), parts, bias };
}

/** The weakest part (most points left on the table), for "what to work on next". */
export function weakestPart(result: DisciplineScore): DisciplinePart | null {
  const sorted = [...result.parts].sort((a, b) => b.max - b.points - (a.max - a.points));
  return sorted[0] && sorted[0].max - sorted[0].points > 0.5 ? sorted[0] : null;
}
