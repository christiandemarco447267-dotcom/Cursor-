// "You vs. S&P 500": portfolio value snapshots, a time-weighted index, and stats (pure; unit-tested).
import { BENCHMARK_SYMBOL } from "./market";
import { quoteMap, round2, summarizePortfolio } from "./portfolio";
import { commit } from "./storage";
import type { AppState, PerfSnapshot, Quote, Transaction } from "./types";
import { LIMITS, normalizeSymbol } from "./validation";

/** At most one periodic snapshot per this interval while the app is open (trades always snapshot). */
export const SNAPSHOT_INTERVAL_MS = 5 * 60_000;

const ms = (iso: string) => new Date(iso).getTime();

function isFlow(tx: Transaction): boolean {
  return tx.type === "deposit" || tx.type === "withdraw";
}

function isActivity(tx: Transaction): boolean {
  return tx.type === "buy" || tx.type === "sell" || isFlow(tx);
}

/** Net deposits − withdrawals strictly after `sinceIso` (up to now). */
export function netFlowSince(transactions: Transaction[], sinceIso: string | null): number {
  if (!sinceIso) return 0;
  const since = ms(sinceIso);
  let flow = 0;
  for (const tx of transactions) {
    if (!isFlow(tx) || ms(tx.createdAt) <= since) continue;
    flow += tx.type === "deposit" ? tx.amount : -tx.amount;
  }
  return round2(flow);
}

/**
 * Keep history bounded without losing its shape: when over the cap, thin the
 * older half by dropping every other point (the very first point, the "account
 * start" anchor, is always kept). A dropped point's cash flow is carried into
 * the next kept point so the time-weighted index stays consistent.
 */
export function capSnapshots(snapshots: PerfSnapshot[], max: number = LIMITS.maxSnapshots): PerfSnapshot[] {
  let list = snapshots;
  while (list.length > max) {
    const half = Math.max(2, Math.floor(list.length / 2));
    const out: PerfSnapshot[] = [list[0]];
    let carry = 0;
    for (let i = 1; i < list.length; i += 1) {
      const point = list[i];
      if (i < half && i % 2 === 1) {
        carry += point.flow;
        continue;
      }
      out.push(carry ? { ...point, flow: round2(point.flow + carry) } : point);
      carry = 0;
    }
    if (out.length >= list.length) break; // safety: no progress
    list = out;
  }
  return list;
}

/** Is a new snapshot due? (none yet, the interval elapsed, or there was account activity since the last one) */
export function snapshotDue(state: AppState, now: number): boolean {
  const last = state.snapshots[state.snapshots.length - 1];
  if (!last) return true;
  const lastT = ms(last.t);
  if (now - lastT >= SNAPSHOT_INTERVAL_MS) return true;
  return state.transactions.some((tx) => isActivity(tx) && ms(tx.createdAt) > lastT);
}

/**
 * Record a snapshot of total portfolio value and the SPY price when one is due.
 * Skips (returns the same state) when SPY or any held symbol has no quote yet,
 * so a half-loaded feed never records a misleading value.
 */
export function maybeRecordSnapshot(state: AppState, quotes: Quote[], now: number = Date.now()): AppState {
  if (!snapshotDue(state, now)) return state;
  const prices = quoteMap(quotes);
  const spy = prices.get(BENCHMARK_SYMBOL);
  if (!spy || !(spy.price > 0)) return state;
  if (state.holdings.some((h) => !prices.has(normalizeSymbol(h.symbol)))) return state;

  const summary = summarizePortfolio(state, quotes);
  const last = state.snapshots[state.snapshots.length - 1];
  // Never stamp a snapshot before activity it already includes (e.g. a fill made a moment ago).
  const latestActivity = state.transactions.reduce((m, tx) => (isActivity(tx) ? Math.max(m, ms(tx.createdAt)) : m), 0);
  const snapshot: PerfSnapshot = {
    t: new Date(Math.max(now, latestActivity)).toISOString(),
    value: round2(summary.total),
    spy: spy.price,
    flow: netFlowSince(state.transactions, last?.t ?? null),
  };
  return commit({ ...state, snapshots: capSnapshots([...state.snapshots, snapshot]) });
}

export type BenchmarkPoint = { t: string; portfolio: number; spy: number };

/**
 * Both lines indexed to 100 at the first snapshot (the account start for this
 * feature). The portfolio line is time-weighted: deposits and withdrawals are
 * removed from each period's return so adding cash doesn't look like a gain.
 * Pass `live` to append an unsaved "right now" point.
 */
export function benchmarkSeries(snapshots: PerfSnapshot[], live?: PerfSnapshot | null): BenchmarkPoint[] {
  const all = live ? [...snapshots, live] : snapshots;
  if (all.length === 0) return [];
  const first = all[0];
  const points: BenchmarkPoint[] = [{ t: first.t, portfolio: 100, spy: 100 }];
  let index = 100;
  for (let i = 1; i < all.length; i += 1) {
    const prev = all[i - 1];
    const cur = all[i];
    const growth = prev.value > 0 ? (cur.value - cur.flow) / prev.value : 1;
    // A non-positive ratio can only come from inconsistent data; never let it wreck the index.
    if (Number.isFinite(growth) && growth > 0) index *= growth;
    points.push({ t: cur.t, portfolio: index, spy: (cur.spy / first.spy) * 100 });
  }
  return points;
}

/** Largest peak-to-trough fall of an index series, as a positive percentage. */
export function maxDrawdownPct(values: number[]): number {
  let peak = -Infinity;
  let worst = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    if (peak > 0) worst = Math.max(worst, ((peak - v) / peak) * 100);
  }
  return worst;
}

export type WinRate = { wins: number; closed: number; percent: number | null };

/** Share of closed trades (sells) that realized a gain. */
export function winRate(transactions: Transaction[]): WinRate {
  const closed = transactions.filter((tx) => tx.type === "sell" && tx.realizedGain !== undefined);
  const wins = closed.filter((tx) => (tx.realizedGain ?? 0) > 0).length;
  return { wins, closed: closed.length, percent: closed.length ? (wins / closed.length) * 100 : null };
}

export type BenchmarkStats = {
  points: BenchmarkPoint[];
  since: string | null;
  totalReturnPct: number;
  spyReturnPct: number;
  outperformancePct: number;
  maxDrawdownPct: number;
  winRate: WinRate;
};

export function benchmarkStats(
  snapshots: PerfSnapshot[],
  transactions: Transaction[],
  live?: PerfSnapshot | null,
): BenchmarkStats {
  const points = benchmarkSeries(snapshots, live);
  const last = points[points.length - 1];
  const totalReturnPct = last ? last.portfolio - 100 : 0;
  const spyReturnPct = last ? last.spy - 100 : 0;
  return {
    points,
    since: points[0]?.t ?? null,
    totalReturnPct,
    spyReturnPct,
    outperformancePct: totalReturnPct - spyReturnPct,
    maxDrawdownPct: maxDrawdownPct(points.map((p) => p.portfolio)),
    winRate: winRate(transactions),
  };
}

/** Unsaved "now" point for the chart, from the current quotes (null if SPY isn't quoted). */
export function livePoint(state: AppState, quotes: Quote[], now: number = Date.now()): PerfSnapshot | null {
  const spy = quoteMap(quotes).get(BENCHMARK_SYMBOL);
  const last = state.snapshots[state.snapshots.length - 1];
  if (!spy || !last || now <= ms(last.t)) return null;
  return {
    t: new Date(now).toISOString(),
    value: round2(summarizePortfolio(state, quotes).total),
    spy: spy.price,
    flow: netFlowSince(state.transactions, last.t),
  };
}
