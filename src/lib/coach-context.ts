// Compact, pre-formatted summary of the user's paper account for the AI coach.
// Every number is formatted HERE (the model is told to quote them verbatim), and
// anything we don't have is spelled out as "not available" so the model has no
// gap to fill in. Raw state is never sent. Pure; unit-tested.
import { benchmarkStats, feedSegment } from "./benchmark";
import { BIAS_INFO, BIAS_KEYS, biasReport, isDecisionTrade } from "./biases";
import { disciplineScore } from "./discipline";
import { formatCurrency, formatPercent, formatSignedCurrency } from "./format";
import { MOOD_INFO } from "./moods";
import type { PortfolioSummary } from "./portfolio";
import type { AppState, Quote } from "./types";

export const CONTEXT_MAX_CHARS = 6000;
const MAX_HOLDINGS = 15;
const MAX_TRADES = 10;
const MAX_THESES = 8;

const NA = "not available";

/** Shares: up to 6 decimals, no trailing zeros, thousands separators. */
export function fmtShares(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

/** Day in YYYY-MM-DD on the user's clock (stable, unambiguous for the model). */
function day(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NA;
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export type CoachContextInput = {
  state: AppState;
  summary: PortfolioSummary;
  quotes: Quote[];
  now?: number;
};

export function buildCoachContext({ state, summary, quotes, now = Date.now() }: CoachContextInput): string {
  const lines: string[] = [];
  const feed = quotes.some((q) => q.source !== "demo") ? "live" : "demo";
  lines.push(`Prices: ${feed === "live" ? "real market quotes (live or delayed)" : "DEMO — simulated prices, not real market data"}`);
  lines.push(`As of: ${day(new Date(now).toISOString())}`);

  // ---- account
  lines.push("", "ACCOUNT");
  lines.push(`Total value: ${formatCurrency(summary.total)}`);
  lines.push(`Cash: ${formatCurrency(summary.cash)} (${summary.total > 0 ? formatPercent((summary.cash / summary.total) * 100) : NA} of total)`);
  lines.push(`Invested: ${formatCurrency(summary.investments)}`);
  lines.push(`Unrealized gain/loss: ${formatSignedCurrency(summary.gain)} (${formatPercent(summary.gainPercent, true)})`);
  const realized = state.transactions.reduce((s, tx) => s + (tx.type === "sell" ? (tx.realizedGain ?? 0) : 0), 0);
  lines.push(`Realized gain/loss (all time): ${formatSignedCurrency(realized)}`);

  // ---- holdings
  lines.push("", `HOLDINGS (${summary.holdings.length})`);
  if (summary.holdings.length === 0) lines.push("None.");
  const sorted = [...summary.holdings].sort((a, b) => b.marketValue - a.marketValue);
  for (const h of sorted.slice(0, MAX_HOLDINGS)) {
    const weight = summary.total > 0 ? formatPercent((h.marketValue / summary.total) * 100) : NA;
    const price = h.hasQuote ? formatCurrency(h.price) : `${NA} (valued at cost)`;
    lines.push(
      `- ${h.symbol}: ${fmtShares(h.shares)} sh, avg cost ${formatCurrency(h.avgCost)}, price ${price}, value ${formatCurrency(h.marketValue)} (${weight} of total), gain ${formatSignedCurrency(h.gain)} (${formatPercent(h.gainPercent, true)}), thesis: ${h.thesisId ? "yes" : "no"}`,
    );
  }
  if (sorted.length > MAX_HOLDINGS) lines.push(`(+${sorted.length - MAX_HOLDINGS} smaller holdings not listed)`);

  // ---- recent trades
  const trades = state.transactions.filter(isDecisionTrade).slice(-MAX_TRADES).reverse();
  lines.push("", `RECENT TRADES (newest first, ${trades.length} shown)`);
  if (trades.length === 0) lines.push("None yet.");
  for (const tx of trades) {
    const mood = tx.mood ? MOOD_INFO[tx.mood].label : "no mood tagged";
    const realizedTx = tx.type === "sell" && tx.realizedGain !== undefined ? `, realized ${formatSignedCurrency(tx.realizedGain)}` : "";
    const dayMove = tx.dayChange !== undefined ? `, stock was ${formatPercent(tx.dayChange, true)} that day` : "";
    lines.push(`- ${day(tx.createdAt)} ${tx.type.toUpperCase()} ${fmtShares(tx.shares ?? 0)} ${tx.symbol ?? "?"} @ ${formatCurrency(tx.price ?? 0)}, mood: ${mood}${dayMove}${realizedTx}`);
  }

  // ---- bias radar
  const bias = biasReport(state.transactions, now);
  lines.push("", `BIAS RADAR (last ${bias.windowDays} days, ${bias.trades} decision trades)`);
  const flagged = BIAS_KEYS.filter((k) => bias.counts[k] > 0);
  if (bias.trades === 0) lines.push("Not enough trades to assess.");
  else if (flagged.length === 0) lines.push("No biases flagged.");
  for (const k of flagged) lines.push(`- ${BIAS_INFO[k].label}: flagged ${bias.counts[k]} time${bias.counts[k] === 1 ? "" : "s"} (${BIAS_INFO[k].short})`);

  // ---- discipline
  const disc = disciplineScore(state, summary, now);
  lines.push("", `DISCIPLINE SCORE: ${Math.round(disc.score)}/100 (${disc.grade})`);
  for (const p of disc.parts) lines.push(`- ${p.label}: ${p.points}/${p.max} — ${clip(p.detail, 120)}`);

  // ---- theses
  lines.push("", `THESES (${state.theses.length})`);
  if (state.theses.length === 0) lines.push("None written yet.");
  const held = new Set(state.holdings.map((h) => h.symbol.toUpperCase()));
  for (const t of state.theses.slice(-MAX_THESES).reverse()) {
    lines.push(
      `- ${t.symbol} "${clip(t.title, 60)}", conviction ${t.conviction}/5, ${held.has(t.symbol.toUpperCase()) ? "held" : "not held"}${t.risks ? `, risks noted: ${clip(t.risks, 80)}` : ", no risks noted"}`,
    );
  }
  if (state.theses.length > MAX_THESES) lines.push(`(+${state.theses.length - MAX_THESES} older theses not listed)`);

  // ---- benchmark
  const segment = feedSegment(state.snapshots);
  lines.push("", "PERFORMANCE VS S&P 500 (SPY)");
  if (segment.length < 2) {
    lines.push(`${NA} — not enough history recorded yet on the current price feed.`);
  } else {
    const b = benchmarkStats(segment, state.transactions);
    lines.push(`Since ${day(b.since ?? segment[0].t)}: portfolio ${formatPercent(b.totalReturnPct, true)}, SPY ${formatPercent(b.spyReturnPct, true)}, difference ${formatPercent(b.outperformancePct, true)} (time-weighted; deposits/withdrawals excluded)`);
    lines.push(`Max drawdown: ${formatPercent(b.maxDrawdownPct)}`);
    lines.push(`Win rate on closed trades: ${b.winRate.percent === null ? NA : `${formatPercent(b.winRate.percent)} (${b.winRate.wins} of ${b.winRate.closed})`}`);
  }

  let text = lines.join("\n");
  if (text.length > CONTEXT_MAX_CHARS) text = `${text.slice(0, CONTEXT_MAX_CHARS - 40)}\n… (summary truncated for length)`;
  return text;
}
