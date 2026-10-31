// /quote — real market quotes. Finnhub first (when a key is configured), then
// Yahoo Finance's public chart API as a fallback. A symbol neither source can
// price is reported in `errors`; it is NEVER filled with a made-up number.
import type { Env } from "./env";

export type MarketState = "open" | "closed" | "pre" | "post";

export type LiveQuote = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  /** When the provider says this price was set (ISO, UTC). */
  timestamp: string;
  source: "finnhub" | "yahoo";
  /** True when the price may lag the market (fallback source, or stale during market hours). */
  delayed: boolean;
};

export type QuoteResponse = {
  quotes: LiveQuote[];
  errors: { symbol: string; error: string }[];
  marketState: MarketState;
  marketStateSource: "finnhub" | "clock";
  asOf: string;
};

export const MAX_SYMBOLS = 25;
const SYMBOL_RE = /^[A-Z][A-Z0-9]{0,5}([.-][A-Z]{1,2})?$/;
/** A live-market quote older than this is labelled delayed. */
const STALE_MS = 20 * 60_000;

export function parseSymbols(raw: string | null, env: Env): { symbols: string[] } | { error: string } {
  if (!raw) return { error: "Pass ?symbols=AAPL,MSFT" };
  if (raw.length > 400) return { error: "Too many symbols." };
  const allow = (env.SYMBOL_ALLOWLIST ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const symbol = part.trim().toUpperCase();
    if (!symbol) continue;
    if (!SYMBOL_RE.test(symbol)) return { error: `Invalid symbol: ${symbol.slice(0, 12)}` };
    if (allow.length && !allow.includes(symbol)) return { error: `Symbol not allowed: ${symbol}` };
    if (!out.includes(symbol)) out.push(symbol);
  }
  if (out.length === 0) return { error: "Pass ?symbols=AAPL,MSFT" };
  if (out.length > MAX_SYMBOLS) return { error: `At most ${MAX_SYMBOLS} symbols per request.` };
  return { symbols: out };
}

const round = (v: number, d = 2) => Math.round((v + Number.EPSILON) * 10 ** d) / 10 ** d;

/** US regular-session state from the New York clock (weekends; holidays NOT known). */
export function clockMarketState(now: Date = new Date()): MarketState {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = get("weekday");
  const minutes = (Number(get("hour")) % 24) * 60 + Number(get("minute"));
  if (weekday === "Sat" || weekday === "Sun") return "closed";
  if (minutes >= 570 && minutes < 960) return "open";
  if (minutes >= 240 && minutes < 570) return "pre";
  if (minutes >= 960 && minutes < 1200) return "post";
  return "closed";
}

export function isDelayed(source: LiveQuote["source"], timestampMs: number, state: MarketState, now: number): boolean {
  if (source === "yahoo") return true;
  return state === "open" && now - timestampMs > STALE_MS;
}

type Fetcher = typeof fetch;

export async function finnhubQuote(symbol: string, key: string, f: Fetcher, state: MarketState, now: number): Promise<LiveQuote> {
  const res = await f(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}`, {
    headers: { "X-Finnhub-Token": key },
    signal: AbortSignal.timeout(4000),
  });
  if (res.status === 429) finnhubBackoffUntil = now + 60_000;
  if (!res.ok) throw new Error(`finnhub ${res.status}`);
  const d = (await res.json()) as { c?: number; d?: number; dp?: number; pc?: number; t?: number };
  // Finnhub answers unknown symbols with zeros rather than an error.
  if (!d.c || !d.pc || !d.t) throw new Error("finnhub: no data");
  const ts = d.t * 1000;
  return {
    symbol,
    price: round(d.c),
    previousClose: round(d.pc),
    change: round(d.d ?? d.c - d.pc),
    changePercent: round(d.dp ?? ((d.c - d.pc) / d.pc) * 100),
    timestamp: new Date(ts).toISOString(),
    source: "finnhub",
    delayed: isDelayed("finnhub", ts, state, now),
  };
}

export async function yahooQuote(symbol: string, f: Fetcher, state: MarketState, now: number): Promise<LiveQuote> {
  const res = await f(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SentiaPilot/1.0)", Accept: "application/json" },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`yahoo ${res.status}`);
  const body = (await res.json()) as {
    chart?: { result?: { meta?: { regularMarketPrice?: number; previousClose?: number; chartPreviousClose?: number; regularMarketTime?: number } }[] };
  };
  const meta = body.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  // With range=1d both fields mean the prior session's close; previousClose is preferred when present.
  const prev = meta?.previousClose ?? meta?.chartPreviousClose;
  const t = meta?.regularMarketTime;
  if (!price || !prev || !t) throw new Error("yahoo: no data");
  const ts = t * 1000;
  return {
    symbol,
    price: round(price),
    previousClose: round(prev),
    change: round(price - prev),
    changePercent: round(((price - prev) / prev) * 100),
    timestamp: new Date(ts).toISOString(),
    source: "yahoo",
    delayed: isDelayed("yahoo", ts, state, now),
  };
}

// ---- caching (per Worker instance; workers.dev has no shared edge cache) ----

type CacheEntry = { quote: LiveQuote; expires: number };
const quoteCache = new Map<string, CacheEntry>();
let stateCache: { state: MarketState; source: "finnhub" | "clock"; expires: number } | null = null;

export function cacheTtlMs(state: MarketState): number {
  return state === "open" ? 15_000 : state === "closed" ? 10 * 60_000 : 60_000;
}

// Finnhub's free plan allows 60 calls/minute. Stay under it per instance, and back
// off for a minute after a 429; Yahoo (labelled Delayed) covers the gap.
export const FINNHUB_PER_MINUTE = 50;
let finnhubWindow = { start: 0, count: 0 };
let finnhubBackoffUntil = 0;

export function finnhubAllowed(now: number): boolean {
  if (now < finnhubBackoffUntil) return false;
  if (now - finnhubWindow.start >= 60_000) finnhubWindow = { start: now, count: 0 };
  if (finnhubWindow.count >= FINNHUB_PER_MINUTE) return false;
  finnhubWindow.count += 1;
  return true;
}

export function clearQuoteCache() {
  quoteCache.clear();
  stateCache = null;
  finnhubWindow = { start: 0, count: 0 };
  finnhubBackoffUntil = 0;
}

export async function marketState(env: Env, f: Fetcher, now: number): Promise<{ state: MarketState; source: "finnhub" | "clock" }> {
  if (stateCache && stateCache.expires > now) return stateCache;
  let result: { state: MarketState; source: "finnhub" | "clock" } = { state: clockMarketState(new Date(now)), source: "clock" };
  if (env.FINNHUB_API_KEY) {
    try {
      const res = await f("https://finnhub.io/api/v1/stock/market-status?exchange=US", {
        headers: { "X-Finnhub-Token": env.FINNHUB_API_KEY },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const d = (await res.json()) as { isOpen?: boolean; session?: string | null };
        const session = (d.session ?? "").toLowerCase();
        const state: MarketState = d.isOpen
          ? session.startsWith("pre")
            ? "pre"
            : session.startsWith("post")
              ? "post"
              : "open"
          : "closed";
        result = { state, source: "finnhub" };
      }
    } catch {
      // keep the clock-based answer
    }
  }
  stateCache = { ...result, expires: now + 60_000 };
  return result;
}

export async function getQuotes(symbols: string[], env: Env, f: Fetcher = fetch, now: number = Date.now()): Promise<QuoteResponse> {
  const { state, source: stateSource } = await marketState(env, f, now);
  const ttl = cacheTtlMs(state);
  const errors: QuoteResponse["errors"] = [];
  const quotes = await Promise.all(
    symbols.map(async (symbol): Promise<LiveQuote | null> => {
      const hit = quoteCache.get(symbol);
      if (hit && hit.expires > now) return hit.quote;
      let lastError = "no provider";
      if (env.FINNHUB_API_KEY && finnhubAllowed(now)) {
        try {
          const q = await finnhubQuote(symbol, env.FINNHUB_API_KEY, f, state, now);
          quoteCache.set(symbol, { quote: q, expires: now + ttl });
          return q;
        } catch (e) {
          lastError = e instanceof Error ? e.message : "finnhub failed";
        }
      }
      try {
        const q = await yahooQuote(symbol, f, state, now);
        quoteCache.set(symbol, { quote: q, expires: now + ttl });
        return q;
      } catch (e) {
        lastError = `${lastError}; ${e instanceof Error ? e.message : "yahoo failed"}`;
      }
      errors.push({ symbol, error: lastError.slice(0, 120) });
      return null;
    }),
  );
  if (quoteCache.size > 2000) quoteCache.clear();
  return {
    quotes: quotes.filter((q): q is LiveQuote => q !== null),
    errors,
    marketState: state,
    marketStateSource: stateSource,
    asOf: new Date(now).toISOString(),
  };
}
