// Bias Radar: rule-based detection of common behavioural trading biases from the
// ledger (pure; unit-tested). Educational heuristics only — they flag patterns
// worth reflecting on, not mistakes, and never block a trade.
import type { Transaction } from "./types";
import { normalizeSymbol } from "./validation";

export const BIAS_KEYS = ["fomo", "revenge", "panic", "disposition", "overtrading"] as const;
export type BiasKey = (typeof BIAS_KEYS)[number];

export const BIAS_RULES = {
  /** FOMO: buying after the symbol is up at least this much on the day (%). */
  fomoDayChangePct: 3,
  /** FOMO: …or buying at/above the highest price seen in this window after a run-up of at least `fomoRunUpPct`. */
  fomoLookbackDays: 30,
  fomoRunUpPct: 5,
  /** Revenge trade: a new buy within this many hours of a realized loss. */
  revengeWindowHours: 24,
  /** Panic sell: selling at a loss on a day the symbol is down at least this much (%). */
  panicDayChangePct: -3,
  /** Overtrading: this many trades inside one rolling window. */
  overtradingCount: 6,
  overtradingWindowHours: 24,
  /** Disposition effect: losers held this many times longer than winners, on average. */
  dispositionRatio: 1.25,
} as const;

export const BIAS_INFO: Record<BiasKey, { label: string; short: string; tip: string }> = {
  fomo: {
    label: "FOMO buy",
    short: "Buying after a big up-move or at a fresh recent high.",
    tip: "Chasing a hot move often means buying from people taking profits. Ask: would I buy this if it were flat today?",
  },
  revenge: {
    label: "Revenge trade",
    short: "A new buy soon after taking a loss.",
    tip: "Right after a loss, the urge to 'win it back' is strong. A short cooling-off period keeps decisions about the idea, not the scoreboard.",
  },
  panic: {
    label: "Panic sell",
    short: "Selling at a loss on a sharp down day.",
    tip: "Big red days amplify fear. Check whether your thesis actually broke, or only the price moved.",
  },
  disposition: {
    label: "Disposition effect",
    short: "Holding losers longer than winners.",
    tip: "Many investors sell winners early and let losers ride hoping to break even. Decide exits by thesis, not by your purchase price.",
  },
  overtrading: {
    label: "Overtrading",
    short: "Many trades in a short window.",
    tip: "Frequent trading adds friction and noise. Fewer, better-reasoned trades tend to beat busy ones.",
  },
};

export type BiasEvent = {
  bias: BiasKey;
  txId: string;
  at: string;
  symbol?: string;
  detail: string;
};

const PROBE_ID = "00000000-0000-4000-8000-000000000000";
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const ms = (iso: string) => new Date(iso).getTime();

/** Trades that reflect a decision (seeded opening positions are excluded). */
export function isDecisionTrade(tx: Transaction): boolean {
  return (tx.type === "buy" || tx.type === "sell") && tx.note !== "Opening position";
}

function chronological(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => ms(a.createdAt) - ms(b.createdAt));
}

export type ClosedTrade = { tx: Transaction; symbol: string; holdMs: number; win: boolean };

/**
 * Walk the ledger and attach a holding period to each sell: the time since the
 * position was opened (went from zero to non-zero shares).
 */
export function closedTrades(transactions: Transaction[]): ClosedTrade[] {
  const shares = new Map<string, number>();
  const openedAt = new Map<string, number>();
  const out: ClosedTrade[] = [];
  for (const tx of chronological(transactions)) {
    if ((tx.type !== "buy" && tx.type !== "sell") || !tx.symbol || !tx.shares) continue;
    const sym = normalizeSymbol(tx.symbol);
    const held = shares.get(sym) ?? 0;
    const t = ms(tx.createdAt);
    if (tx.type === "buy") {
      if (held <= 1e-9) openedAt.set(sym, t);
      shares.set(sym, held + tx.shares);
    } else {
      const opened = openedAt.get(sym) ?? t;
      out.push({ tx, symbol: sym, holdMs: Math.max(0, t - opened), win: (tx.realizedGain ?? 0) > 0 });
      const left = held - tx.shares;
      shares.set(sym, left > 1e-9 ? left : 0);
      if (left <= 1e-9) openedAt.delete(sym);
    }
  }
  return out;
}

export type Disposition = {
  avgWinnerHoldDays: number | null;
  avgLoserHoldDays: number | null;
  winners: number;
  losers: number;
  flagged: boolean;
  /** Losing sells held longer than the average winner. */
  lingeringLosers: ClosedTrade[];
};

export function dispositionEffect(closed: ClosedTrade[]): Disposition {
  const decided = closed.filter((c) => c.tx.realizedGain !== undefined && c.tx.realizedGain !== 0);
  const winners = decided.filter((c) => c.win);
  const losers = decided.filter((c) => !c.win);
  const avg = (list: ClosedTrade[]) => (list.length ? list.reduce((s, c) => s + c.holdMs, 0) / list.length / DAY : null);
  const w = avg(winners);
  const l = avg(losers);
  const flagged = w !== null && l !== null && l > Math.max(w, 1 / 24) * BIAS_RULES.dispositionRatio;
  return {
    avgWinnerHoldDays: w,
    avgLoserHoldDays: l,
    winners: winners.length,
    losers: losers.length,
    flagged,
    lingeringLosers: flagged && w !== null ? losers.filter((c) => c.holdMs / DAY > w) : [],
  };
}

/** Detect per-trade bias events (FOMO, revenge, panic, overtrading) across the whole ledger. */
export function detectBiasEvents(transactions: Transaction[]): BiasEvent[] {
  const events: BiasEvent[] = [];
  const all = chronological(transactions).filter((tx) => tx.type === "buy" || tx.type === "sell");
  const decisions = all.filter(isDecisionTrade);
  let lastOvertradingAt = -Infinity;

  for (const tx of decisions) {
    const t = ms(tx.createdAt);
    const sym = tx.symbol ? normalizeSymbol(tx.symbol) : undefined;

    if (tx.type === "buy") {
      // FOMO: big up day…
      if (tx.dayChange !== undefined && tx.dayChange >= BIAS_RULES.fomoDayChangePct) {
        events.push({ bias: "fomo", txId: tx.id, at: tx.createdAt, symbol: sym, detail: `Bought ${sym} while it was up ${tx.dayChange.toFixed(1)}% on the day.` });
      } else if (sym && tx.price) {
        // …or a fresh recent high after a run-up, judged from your own earlier fills.
        const since = t - BIAS_RULES.fomoLookbackDays * DAY;
        const seen = all
          .filter((o) => o !== tx && o.symbol && normalizeSymbol(o.symbol) === sym && o.price && ms(o.createdAt) < t && ms(o.createdAt) >= since)
          .map((o) => o.price as number);
        if (seen.length) {
          const hi = Math.max(...seen);
          const lo = Math.min(...seen);
          if (tx.price >= hi && lo > 0 && ((tx.price - lo) / lo) * 100 >= BIAS_RULES.fomoRunUpPct) {
            events.push({ bias: "fomo", txId: tx.id, at: tx.createdAt, symbol: sym, detail: `Bought ${sym} at a new recent high, ${(((tx.price - lo) / lo) * 100).toFixed(0)}% above where you traded it lately.` });
          }
        }
      }
      // Revenge: a buy shortly after a realized loss.
      const recentLoss = decisions.find(
        (o) => o.type === "sell" && (o.realizedGain ?? 0) < 0 && ms(o.createdAt) <= t && t - ms(o.createdAt) <= BIAS_RULES.revengeWindowHours * HOUR && o !== tx,
      );
      if (recentLoss) {
        const hours = Math.max(0, (t - ms(recentLoss.createdAt)) / HOUR);
        events.push({ bias: "revenge", txId: tx.id, at: tx.createdAt, symbol: sym, detail: `Bought ${sym} ${hours < 1 ? "within the hour" : `${hours.toFixed(0)}h`} after a realized loss on ${recentLoss.symbol}.` });
      }
    } else if (tx.dayChange !== undefined && tx.dayChange <= BIAS_RULES.panicDayChangePct && (tx.realizedGain ?? 0) < 0) {
      events.push({ bias: "panic", txId: tx.id, at: tx.createdAt, symbol: sym, detail: `Sold ${sym} at a loss on a ${tx.dayChange.toFixed(1)}% down day.` });
    }

    // Overtrading: N decisions inside a rolling window (flagged once per window).
    const windowStart = t - BIAS_RULES.overtradingWindowHours * HOUR;
    const inWindow = decisions.filter((o) => ms(o.createdAt) > windowStart && ms(o.createdAt) <= t).length;
    if (inWindow >= BIAS_RULES.overtradingCount && (tx.id === PROBE_ID || t - lastOvertradingAt > BIAS_RULES.overtradingWindowHours * HOUR)) {
      lastOvertradingAt = t;
      events.push({ bias: "overtrading", txId: tx.id, at: tx.createdAt, symbol: sym, detail: `${inWindow} trades within ${BIAS_RULES.overtradingWindowHours} hours.` });
    }
  }
  return events;
}

export type BiasReport = {
  windowDays: number;
  counts: Record<BiasKey, number>;
  total: number;
  events: BiasEvent[];
  disposition: Disposition;
  /** Decision trades in the window (denominator for "biases avoided"). */
  trades: number;
};

/** Bias Radar summary for the last `windowDays` days. */
export function biasReport(transactions: Transaction[], now: number = Date.now(), windowDays = 30): BiasReport {
  const since = now - windowDays * DAY;
  const events = detectBiasEvents(transactions).filter((e) => ms(e.at) >= since && ms(e.at) <= now);
  const closed = closedTrades(transactions).filter((c) => ms(c.tx.createdAt) >= since && ms(c.tx.createdAt) <= now);
  const disposition = dispositionEffect(closed);
  const counts = Object.fromEntries(BIAS_KEYS.map((k) => [k, 0])) as Record<BiasKey, number>;
  for (const e of events) counts[e.bias] += 1;
  counts.disposition = disposition.flagged ? Math.max(1, disposition.lingeringLosers.length) : 0;
  const trades = transactions.filter((tx) => isDecisionTrade(tx) && ms(tx.createdAt) >= since && ms(tx.createdAt) <= now).length;
  return {
    windowDays,
    counts,
    total: BIAS_KEYS.reduce((s, k) => s + counts[k], 0),
    events: events.sort((a, b) => ms(b.at) - ms(a.at)),
    disposition,
    trades,
  };
}

export type TradeCandidate = {
  side: "buy" | "sell";
  symbol: string;
  shares: number;
  price: number;
  dayChange?: number;
  /** Average cost of the current position (sells), to estimate the realized result. */
  avgCost?: number;
};

export type BiasNudge = { bias: BiasKey; title: string; body: string };

/** Gentle, non-blocking nudges for a trade the user is about to place. */
export function previewTradeBiases(transactions: Transaction[], candidate: TradeCandidate, now: number = Date.now()): BiasNudge[] {
  if (!(candidate.shares > 0) || !(candidate.price > 0) || !candidate.symbol) return [];
  const realizedGain =
    candidate.side === "sell" && candidate.avgCost !== undefined ? (candidate.price - candidate.avgCost) * candidate.shares : undefined;
  const probe: Transaction = {
    id: PROBE_ID,
    type: candidate.side,
    symbol: normalizeSymbol(candidate.symbol),
    shares: candidate.shares,
    price: candidate.price,
    amount: candidate.shares * candidate.price,
    cashAfter: 0,
    note: "",
    createdAt: new Date(now).toISOString(),
    ...(candidate.dayChange !== undefined ? { dayChange: candidate.dayChange } : {}),
    ...(realizedGain !== undefined ? { realizedGain } : {}),
  };
  return detectBiasEvents([...transactions, probe])
    .filter((e) => e.txId === probe.id)
    .map((e) => ({ bias: e.bias, title: BIAS_INFO[e.bias].label, body: `${e.detail.replace(/^Bought|^Sold/, (w) => (w === "Bought" ? "Buying" : "Selling"))} ${BIAS_INFO[e.bias].tip}` }));
}
