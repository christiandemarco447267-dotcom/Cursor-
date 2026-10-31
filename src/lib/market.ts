import type { MarketSnapshot, MarketStatus, Quote } from "./types";
import { normalizeSymbol } from "./validation";

export type UniverseEntry = { symbol: string; name: string; base: number };

// A small, stable demo universe. `base` seeds deterministic demo pricing.
export const DEMO_UNIVERSE: UniverseEntry[] = [
  { symbol: "VTI", name: "Vanguard Total Stock Market ETF", base: 246 },
  { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", base: 492 },
  { symbol: "VOO", name: "Vanguard S&P 500 ETF", base: 452 },
  { symbol: "VXUS", name: "Vanguard Total International Stock ETF", base: 59 },
  { symbol: "BND", name: "Vanguard Total Bond Market ETF", base: 72 },
  { symbol: "AAPL", name: "Apple Inc.", base: 214 },
  { symbol: "MSFT", name: "Microsoft Corporation", base: 438 },
  { symbol: "GOOGL", name: "Alphabet Inc.", base: 178 },
  { symbol: "AMZN", name: "Amazon.com, Inc.", base: 186 },
  { symbol: "NVDA", name: "NVIDIA Corporation", base: 124 },
  { symbol: "SCHD", name: "Schwab U.S. Dividend Equity ETF", base: 27 },
];

/** The benchmark the portfolio is measured against ("You vs. S&P 500"). Always requested from the feed. */
export const BENCHMARK_SYMBOL = "SPY";

const UNIVERSE_MAP = new Map(DEMO_UNIVERSE.map((entry) => [entry.symbol, entry]));

/**
 * Display names for well-known tickers outside the demo universe (Time Machine scenarios, Legend
 * portfolios, popular searches). Names only: they don't join the Markets list or change demo pricing.
 */
export const KNOWN_NAMES: Readonly<Record<string, string>> = {
  TSLA: "Tesla, Inc.",
  GME: "GameStop Corp.",
  META: "Meta Platforms, Inc.",
  NFLX: "Netflix, Inc.",
  AMD: "Advanced Micro Devices, Inc.",
  GOOG: "Alphabet Inc. (Class C)",
  QQQ: "Invesco QQQ Trust",
  "BRK.B": "Berkshire Hathaway Inc. (Class B)",
  "BRK.A": "Berkshire Hathaway Inc. (Class A)",
  AXP: "American Express Company",
  BAC: "Bank of America Corporation",
  CVX: "Chevron Corporation",
  JPM: "JPMorgan Chase & Co.",
  KO: "The Coca-Cola Company",
  OXY: "Occidental Petroleum Corporation",
  XOM: "Exxon Mobil Corporation",
  KHC: "The Kraft Heinz Company",
  MCO: "Moody's Corporation",
  CB: "Chubb Limited",
  DVA: "DaVita Inc.",
  VRSN: "VeriSign, Inc.",
  SIRI: "Sirius XM Holdings Inc.",
};

export function nameForSymbol(symbol: string): string {
  const key = normalizeSymbol(symbol);
  return UNIVERSE_MAP.get(key)?.name ?? KNOWN_NAMES[key] ?? key;
}

/** Deterministic 32-bit hash so demo data is stable for a given seed. */
function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function baseForSymbol(symbol: string): number {
  const entry = UNIVERSE_MAP.get(symbol);
  if (entry) return entry.base;
  // Derive a plausible, stable base price for unknown symbols.
  return 40 + (hashSeed(symbol) % 400);
}

// How often the simulated price advances to a new value (ms).
export const SIM_TICK_MS = 12_000;

/**
 * A time-varying "live" quote used when no real market provider is configured.
 * The price evolves continuously (a slow intraday wave plus per-tick jitter) so
 * the UI reflects changes automatically on each refresh. Movement is dampened
 * when the US market is closed, while the day's `previousClose` stays stable.
 */
export function demoQuote(symbol: string, now: number = Date.now()): Quote {
  const normalized = normalizeSymbol(symbol);
  const base = baseForSymbol(normalized);
  const open = marketStatusNow(new Date(now)) === "open";

  // Slow drift over ~90 minutes, offset per symbol so tickers don't move in lockstep.
  const phase = hashSeed(normalized) % 360;
  const slow = Math.sin(now / 5_400_000 + phase) * 0.9;

  // Fresh jitter every SIM_TICK_MS so prices visibly update between refreshes.
  const tick = Math.floor(now / SIM_TICK_MS);
  const jitter = (mulberry32(hashSeed(`${normalized}:${tick}`))() - 0.5) * (open ? 1.6 : 0.5);

  const changePercent = round2(slow + jitter);
  const previousClose = round2(base);
  const price = round2(previousClose * (1 + changePercent / 100));
  return {
    symbol: normalized,
    price,
    previousClose,
    changePercent,
    source: "demo",
  };
}

export type PriceSource = "pending" | "live" | "mixed" | "demo";

/**
 * Where the prices on screen come from, derived from the feed's own reporting
 * (`status` plus each quote's `source`). "demo" means fully simulated — always
 * the case on the static GitHub Pages build, or whenever no live provider is
 * configured/reachable. "mixed" means a live provider answered for only some
 * symbols and the rest fell back to simulated quotes.
 */
export function priceSourceOf(market: { status: string; quotes: Pick<Quote, "source">[] }): PriceSource {
  if (market.status === "demo") return "demo";
  if (market.quotes.length === 0) return market.status === "loading" ? "pending" : "demo";
  // Real quotes (live or delayed) count as live data.
  const live = market.quotes.filter((q) => q.source !== "demo").length;
  if (live === 0) return "demo";
  return live === market.quotes.length ? "live" : "mixed";
}

export function demoSnapshot(symbols: string[], now: number = Date.now()): MarketSnapshot {
  const unique = uniqueSymbols(symbols);
  return {
    status: "demo",
    updatedAt: new Date(now).toISOString(),
    quotes: unique.map((symbol) => demoQuote(symbol, now)),
  };
}

/** Deterministic sparkline series (0..1 normalized) for a symbol. */
export function sparklineForSymbol(symbol: string, points = 24): number[] {
  const rand = mulberry32(hashSeed(normalizeSymbol(symbol)));
  const series: number[] = [];
  let value = 0.5;
  for (let i = 0; i < points; i += 1) {
    value += (rand() - 0.5) * 0.18;
    value = Math.min(1, Math.max(0, value));
    series.push(value);
  }
  return series;
}

/** US equity market status based on Eastern Time (ignores holidays). */
export function marketStatusNow(now: Date = new Date()): Extract<MarketStatus, "open" | "closed"> {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const isWeekend = weekday === "Sat" || weekday === "Sun";
  const minutes = hour * 60 + minute;
  const open = 9 * 60 + 30;
  const close = 16 * 60;
  return !isWeekend && minutes >= open && minutes < close ? "open" : "closed";
}

export function uniqueSymbols(symbols: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of symbols) {
    const symbol = normalizeSymbol(raw);
    if (symbol && !seen.has(symbol)) {
      seen.add(symbol);
      result.push(symbol);
    }
  }
  return result;
}

export function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
