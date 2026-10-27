// Time Machine: replay a real historical market as a separate practice account
// (pure; unit-tested). The session lives in `state.replay` and never touches the
// main account's cash, holdings or ledger.
import rawData from "../data/time-machine.json";
import { maxDrawdownPct, type BenchmarkPoint } from "./benchmark";
import { formatCurrency, formatNumber } from "./format";
import { round2 } from "./portfolio";
import { commit, newId, nowIso } from "./storage";
import type { AppState, ReplayResult, ReplaySession, ReplayTrade } from "./types";
import { LIMITS, normalizeSymbol } from "./validation";

export const REPLAY_START_CASH = 10_000;
/** "Step 1 week" = five trading days. */
export const TRADING_DAYS_PER_WEEK = 5;

export type ScenarioData = { dates: string[]; prices: Record<string, number[]> };

export type ScenarioMeta = {
  id: string;
  title: string;
  period: string;
  blurb: string;
  lesson: string;
};

export type Scenario = ScenarioMeta & ScenarioData;

export const SCENARIO_META: ScenarioMeta[] = [
  {
    id: "covid-2020",
    title: "COVID crash",
    period: "Feb 2020 – Jun 2020",
    blurb: "The fastest bear market on record: the S&P 500 fell about a third in five weeks, then rebounded hard.",
    lesson: "Did you panic-sell near the bottom, or stick to a plan through extreme volatility?",
  },
  {
    id: "gfc-2008",
    title: "2008 financial crisis",
    period: "Sep 2008 – Mar 2009",
    blurb: "Lehman Brothers fails, banks wobble and stocks grind lower for six months to the March 2009 low.",
    lesson: "A slow, grinding decline tests patience and position sizing more than a sudden crash.",
  },
  {
    id: "meme-2021",
    title: "2021 meme & tech run",
    period: "Jan 2021 – Dec 2021",
    blurb: "Meme-stock mania (GME), a roaring tech market and a steady climb for the index.",
    lesson: "When everything is going up, does chasing the hottest names beat simply owning the index?",
  },
];

type RawData = { source: string; fetchedAt: string; scenarios: Record<string, ScenarioData & { dropped?: string[] }> };
const DATA = rawData as RawData;

export const TIME_MACHINE_SOURCE = DATA.source;
export const TIME_MACHINE_FETCHED = DATA.fetchedAt;

export function getScenario(id: string): Scenario | null {
  const meta = SCENARIO_META.find((m) => m.id === id);
  const data = DATA.scenarios[id];
  if (!meta || !data) return null;
  return { ...meta, dates: data.dates, prices: data.prices };
}

export function listScenarios(): Scenario[] {
  return SCENARIO_META.map((m) => getScenario(m.id)).filter((s): s is Scenario => Boolean(s));
}

export function scenarioSymbols(scenario: ScenarioData): string[] {
  return Object.keys(scenario.prices);
}

export function closeOn(scenario: ScenarioData, symbol: string, day: number): number | null {
  const series = scenario.prices[normalizeSymbol(symbol)];
  const v = series?.[day];
  return typeof v === "number" && v > 0 ? v : null;
}

export type ReplayPosition = { symbol: string; shares: number; avgCost: number };

export type ReplayBook = {
  cash: number;
  positions: ReplayPosition[];
  realized: number;
};

function applyTrade(book: { cash: number; positions: Map<string, ReplayPosition>; realized: number }, trade: ReplayTrade, price: number) {
  const sym = normalizeSymbol(trade.symbol);
  const pos = book.positions.get(sym);
  if (trade.side === "buy") {
    const cost = round2(trade.shares * price);
    book.cash = round2(book.cash - cost);
    if (pos) {
      const shares = pos.shares + trade.shares;
      book.positions.set(sym, { symbol: sym, shares, avgCost: (pos.shares * pos.avgCost + trade.shares * price) / shares });
    } else {
      book.positions.set(sym, { symbol: sym, shares: trade.shares, avgCost: price });
    }
  } else if (pos) {
    book.cash = round2(book.cash + trade.shares * price);
    book.realized = round2(book.realized + (price - pos.avgCost) * trade.shares);
    const left = pos.shares - trade.shares;
    if (left <= 1e-9) book.positions.delete(sym);
    else book.positions.set(sym, { ...pos, shares: left });
  }
}

/** Cash and positions after all trades up to and including `uptoDay`. */
export function replayBook(session: ReplaySession, scenario: ScenarioData, uptoDay = session.dayIndex): ReplayBook {
  const book = { cash: session.startCash, positions: new Map<string, ReplayPosition>(), realized: 0 };
  for (const trade of session.trades) {
    if (trade.day > uptoDay) continue;
    const price = closeOn(scenario, trade.symbol, trade.day);
    if (price !== null) applyTrade(book, trade, price);
  }
  return { cash: book.cash, positions: [...book.positions.values()], realized: book.realized };
}

export function bookValue(book: ReplayBook, scenario: ScenarioData, day: number): number {
  return round2(book.positions.reduce((sum, p) => sum + p.shares * (closeOn(scenario, p.symbol, day) ?? p.avgCost), book.cash));
}

export type EquityDay = { day: number; date: string; value: number; cash: number; spy: number; maxWeightPct: number };

/** Daily account value from day 0 to the session's current day (trades fill at each day's close). */
export function equityCurve(session: ReplaySession, scenario: ScenarioData): EquityDay[] {
  const book = { cash: session.startCash, positions: new Map<string, ReplayPosition>(), realized: 0 };
  const byDay = new Map<number, ReplayTrade[]>();
  for (const t of session.trades) byDay.set(t.day, [...(byDay.get(t.day) ?? []), t]);
  const out: EquityDay[] = [];
  const last = Math.min(session.dayIndex, scenario.dates.length - 1);
  for (let d = 0; d <= last; d += 1) {
    for (const t of byDay.get(d) ?? []) {
      const price = closeOn(scenario, t.symbol, d);
      if (price !== null) applyTrade(book, t, price);
    }
    let invested = 0;
    let maxPos = 0;
    for (const p of book.positions.values()) {
      const v = p.shares * (closeOn(scenario, p.symbol, d) ?? p.avgCost);
      invested += v;
      maxPos = Math.max(maxPos, v);
    }
    const value = round2(book.cash + invested);
    out.push({
      day: d,
      date: scenario.dates[d],
      value,
      cash: book.cash,
      spy: closeOn(scenario, "SPY", d) ?? 0,
      maxWeightPct: value > 0 ? (maxPos / value) * 100 : 0,
    });
  }
  return out;
}

/** Both lines indexed to 100 on the first day, for the shared benchmark chart. */
export function replayChartPoints(curve: EquityDay[], startCash: number): BenchmarkPoint[] {
  if (!curve.length) return [];
  const spy0 = curve[0].spy || 1;
  return curve.map((c) => ({ t: `${c.date}T21:00:00.000Z`, portfolio: (c.value / startCash) * 100, spy: (c.spy / spy0) * 100 }));
}

// ---- Session mutations (on AppState; never touch the main account) ---------

export function startReplay(state: AppState, scenarioId: string): AppState {
  if (!getScenario(scenarioId)) throw new Error("Unknown scenario.");
  const session: ReplaySession = {
    id: newId(),
    scenarioId,
    startCash: REPLAY_START_CASH,
    dayIndex: 0,
    trades: [],
    startedAt: nowIso(),
  };
  return commit({ ...state, replay: session });
}

export function endReplay(state: AppState): AppState {
  if (!state.replay) return state;
  return commit({ ...state, replay: null });
}

function requireSession(state: AppState): { session: ReplaySession; scenario: Scenario } {
  const session = state.replay;
  if (!session) throw new Error("Start a Time Machine scenario first.");
  const scenario = getScenario(session.scenarioId);
  if (!scenario) throw new Error("This scenario is no longer available.");
  return { session, scenario };
}

export type ReplayTradeInput = { side: "buy" | "sell"; symbol: string; shares: number };

export function replayTrade(state: AppState, input: ReplayTradeInput): AppState {
  const { session, scenario } = requireSession(state);
  if (session.finishedAt) throw new Error("This replay is finished. Start a new one to keep trading.");
  const symbol = normalizeSymbol(input.symbol);
  const price = closeOn(scenario, symbol, session.dayIndex);
  if (price === null) throw new Error(`${symbol} isn't available in this scenario.`);
  if (!Number.isFinite(input.shares) || input.shares <= 0 || input.shares > LIMITS.maxShares) {
    throw new Error("Enter a positive number of shares.");
  }
  if (session.trades.length >= LIMITS.maxReplayTrades) throw new Error("Trade limit reached for this replay.");
  const book = replayBook(session, scenario);
  if (input.side === "buy") {
    const cost = round2(input.shares * price);
    if (cost > book.cash + 1e-9) throw new Error(`Not enough cash: that costs ${formatCurrency(cost)} and you have ${formatCurrency(book.cash)}.`);
  } else {
    const pos = book.positions.find((p) => p.symbol === symbol);
    if (!pos || input.shares > pos.shares + 1e-9) throw new Error(`You only hold ${formatNumber(pos?.shares ?? 0)} ${symbol}.`);
  }
  const trade: ReplayTrade = { day: session.dayIndex, side: input.side, symbol, shares: input.shares };
  return commit({ ...state, replay: { ...session, trades: [...session.trades, trade] } });
}

export type StepResult = { state: AppState; finished: ReplayResult | null };

/** Advance the replay by `days` trading days (or to the end). Reaching the last day finishes it and records the result. */
export function stepReplay(state: AppState, by: number | "end"): StepResult {
  const { session, scenario } = requireSession(state);
  if (session.finishedAt) return { state, finished: null };
  const lastDay = scenario.dates.length - 1;
  const dayIndex = by === "end" ? lastDay : Math.min(lastDay, session.dayIndex + Math.max(1, Math.floor(by)));
  let next: ReplaySession = { ...session, dayIndex };
  let finished: ReplayResult | null = null;
  let replayHistory = state.replayHistory;
  if (dayIndex >= lastDay) {
    next = { ...next, finishedAt: nowIso() };
    const card = reportCard(next, scenario);
    finished = {
      scenarioId: session.scenarioId,
      returnPct: round2(card.returnPct),
      spyReturnPct: round2(card.spyReturnPct),
      maxDrawdownPct: round2(card.maxDrawdownPct),
      trades: session.trades.length,
      finishedAt: next.finishedAt as string,
    };
    replayHistory = [...state.replayHistory, finished].slice(-LIMITS.maxReplayHistory);
  }
  return { state: commit({ ...state, replay: next, replayHistory }), finished };
}

// ---- Report card -------------------------------------------------------------

export type FeedbackTone = "good" | "watch" | "info";
export type Feedback = { tone: FeedbackTone; title: string; body: string };

export type ReportCard = {
  returnPct: number;
  spyReturnPct: number;
  beatSpy: boolean;
  maxDrawdownPct: number;
  spyMaxDrawdownPct: number;
  trades: number;
  /** Discipline-style process score for the replay (0–100). */
  processScore: number;
  feedback: Feedback[];
};

/** SPY's drawdown from its running peak on each day (%). */
function spyDrawdowns(curve: EquityDay[]): number[] {
  let peak = 0;
  return curve.map((c) => {
    peak = Math.max(peak, c.spy);
    return peak > 0 ? ((peak - c.spy) / peak) * 100 : 0;
  });
}

export const CRASH_DRAWDOWN_PCT = 15;

export function reportCard(session: ReplaySession, scenario: ScenarioData): ReportCard {
  const curve = equityCurve(session, scenario);
  const first = curve[0];
  const last = curve[curve.length - 1];
  const returnPct = last ? (last.value / session.startCash - 1) * 100 : 0;
  const spyReturnPct = first && last && first.spy ? (last.spy / first.spy - 1) * 100 : 0;
  const maxDd = maxDrawdownPct(curve.map((c) => c.value));
  const spyDd = maxDrawdownPct(curve.map((c) => c.spy));
  const dd = spyDrawdowns(curve);
  const feedback: Feedback[] = [];
  let score = 100;

  const beat = returnPct > spyReturnPct;
  feedback.push({
    tone: beat ? "good" : "info",
    title: beat ? "You beat the S&P 500" : "The index won this one",
    body: `You returned ${returnPct.toFixed(1)}% vs SPY's ${spyReturnPct.toFixed(1)}%. ${beat ? "Ask whether it was process or luck." : "Simply holding the index is a hard benchmark to beat."}`,
  });

  // Panic selling into the crash vs. buying the dip.
  const panic = session.trades.filter((t) => {
    if (t.side !== "sell") return false;
    const book = replayBook(session, scenario, t.day - 1);
    const pos = book.positions.find((p) => p.symbol === t.symbol);
    const price = closeOn(scenario, t.symbol, t.day) ?? 0;
    return (dd[t.day] ?? 0) >= CRASH_DRAWDOWN_PCT && pos !== undefined && price < pos.avgCost;
  });
  const dipBuys = session.trades.filter((t) => t.side === "buy" && (dd[t.day] ?? 0) >= CRASH_DRAWDOWN_PCT);
  if (panic.length) {
    score -= Math.min(25, panic.length * 10);
    feedback.push({ tone: "watch", title: "Sold into the drawdown", body: `${panic.length} sell${panic.length === 1 ? "" : "s"} at a loss while the market was ${CRASH_DRAWDOWN_PCT}%+ off its high. Panic selling locks in losses right before rebounds.` });
  }
  if (dipBuys.length) {
    feedback.push({ tone: "good", title: "Bought when others were fearful", body: `${dipBuys.length} buy${dipBuys.length === 1 ? "" : "s"} while the market was ${CRASH_DRAWDOWN_PCT}%+ below its high.` });
  }

  // Concentration.
  const peakWeight = Math.max(0, ...curve.map((c) => c.maxWeightPct));
  if (peakWeight > 40) {
    score -= peakWeight > 70 ? 25 : 15;
    feedback.push({ tone: "watch", title: "Concentrated bets", body: `At one point a single stock was ${peakWeight.toFixed(0)}% of your account. Sizing positions at ~25% or less limits the damage when you're wrong.` });
  } else if (peakWeight > 25) {
    score -= 5;
    feedback.push({ tone: "info", title: "Sizing a bit heavy", body: `Your largest position peaked at ${peakWeight.toFixed(0)}% of the account, above the ~25% guideline.` });
  } else if (session.trades.length) {
    feedback.push({ tone: "good", title: "Sensible sizing", body: `Your largest position peaked at ${peakWeight.toFixed(0)}% of the account.` });
  }

  // Cash drag.
  const avgCash = curve.length ? curve.reduce((s, c) => s + (c.value > 0 ? c.cash / c.value : 1), 0) / curve.length : 1;
  if (avgCash > 0.6) {
    score -= 15;
    feedback.push({ tone: "info", title: "Mostly on the sidelines", body: `You held ${Math.round(avgCash * 100)}% cash on average. Cash avoids drawdowns but also misses recoveries.` });
  }

  // Overtrading.
  const tradeDays = new Set(session.trades.map((t) => t.day)).size;
  if (curve.length > 0 && tradeDays > curve.length / 3) {
    score -= 15;
    feedback.push({ tone: "watch", title: "Very active trading", body: `You traded on ${tradeDays} of ${curve.length} days. Busy trading rarely beats a patient plan.` });
  }

  // Diversification.
  const symbols = new Set(session.trades.filter((t) => t.side === "buy").map((t) => t.symbol));
  if (symbols.size >= 3) feedback.push({ tone: "good", title: "Diversified", body: `You spread money across ${symbols.size} tickers.` });
  else if (symbols.size > 0) score -= 10;

  if (maxDd < spyDd - 1) feedback.push({ tone: "good", title: "Smaller drawdown than the market", body: `Your worst drop was ${maxDd.toFixed(1)}% vs SPY's ${spyDd.toFixed(1)}%.` });

  return {
    returnPct,
    spyReturnPct,
    beatSpy: beat,
    maxDrawdownPct: maxDd,
    spyMaxDrawdownPct: spyDd,
    trades: session.trades.length,
    processScore: Math.max(0, Math.min(100, score)),
    feedback,
  };
}
