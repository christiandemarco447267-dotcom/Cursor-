// Real quotes from the Sentia API (/quote on the Cloudflare Worker). Pure parsing
// is separated from the network call so it can be unit-tested.
import { apiConfigured, apiUrl } from "./api-config";
import type { Quote } from "./types";
import { isValidSymbol, normalizeSymbol } from "./validation";

export type WorkerMarketState = "open" | "closed" | "pre" | "post";

export type LiveSnapshot = {
  quotes: Quote[];
  /** Symbols the API could not price. They get NO price (never a simulated one). */
  missing: string[];
  marketState: WorkerMarketState;
  asOf: string;
};

const MARKET_STATES: WorkerMarketState[] = ["open", "closed", "pre", "post"];
const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

/** Validate the API's JSON. Anything malformed is dropped rather than guessed at. */
export function parseQuoteResponse(body: unknown, requested: string[]): LiveSnapshot | null {
  if (!body || typeof body !== "object") return null;
  const b = body as { quotes?: unknown; marketState?: unknown; asOf?: unknown };
  if (!Array.isArray(b.quotes)) return null;
  const quotes: Quote[] = [];
  for (const raw of b.quotes) {
    if (!raw || typeof raw !== "object") continue;
    const q = raw as Record<string, unknown>;
    const symbol = typeof q.symbol === "string" ? normalizeSymbol(q.symbol) : "";
    const price = Number(q.price);
    const prev = Number(q.previousClose);
    const ts = typeof q.timestamp === "string" && !Number.isNaN(Date.parse(q.timestamp)) ? q.timestamp : undefined;
    if (!isValidSymbol(symbol) || !(price > 0) || !(prev > 0) || !Number.isFinite(price) || !ts) continue;
    const changePercent = Number.isFinite(Number(q.changePercent)) ? round2(Number(q.changePercent)) : round2(((price - prev) / prev) * 100);
    quotes.push({
      symbol,
      price: round2(price),
      previousClose: round2(prev),
      change: Number.isFinite(Number(q.change)) ? round2(Number(q.change)) : round2(price - prev),
      changePercent,
      source: q.delayed === true ? "delayed" : "live",
      asOf: ts,
      provider: typeof q.source === "string" ? q.source.slice(0, 20) : undefined,
    });
  }
  const got = new Set(quotes.map((q) => q.symbol));
  const marketState = MARKET_STATES.includes(b.marketState as WorkerMarketState) ? (b.marketState as WorkerMarketState) : "closed";
  return {
    quotes,
    missing: requested.map(normalizeSymbol).filter((s) => !got.has(s)),
    marketState,
    asOf: typeof b.asOf === "string" ? b.asOf : new Date().toISOString(),
  };
}

const CHUNK = 25;
const MAX_LIVE_SYMBOLS = 100;

/** Fetch real quotes (in chunks of 25). Throws when the API is unreachable or returns nothing usable. */
export async function fetchLiveQuotes(symbols: string[], signal?: AbortSignal): Promise<LiveSnapshot> {
  if (!apiConfigured()) throw new Error("No live price service configured.");
  const list = symbols.slice(0, MAX_LIVE_SYMBOLS);
  const chunks: string[][] = [];
  for (let i = 0; i < list.length; i += CHUNK) chunks.push(list.slice(i, i + CHUNK));
  const parts = await Promise.all(
    chunks.map(async (chunk) => {
      const res = await fetch(apiUrl(`/quote?symbols=${encodeURIComponent(chunk.join(","))}`), {
        cache: "no-store",
        signal: signal ?? AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`Live price service responded ${res.status}.`);
      const parsed = parseQuoteResponse(await res.json(), chunk);
      if (!parsed) throw new Error("Live price service sent an unreadable response.");
      return parsed;
    }),
  );
  const quotes = parts.flatMap((p) => p.quotes);
  if (quotes.length === 0) throw new Error("Live price service returned no prices.");
  return {
    quotes,
    missing: parts.flatMap((p) => p.missing),
    marketState: parts[0]?.marketState ?? "closed",
    asOf: parts[0]?.asOf ?? new Date().toISOString(),
  };
}

/** "3:42 PM ET" — quote times are always shown on the New York clock. */
export function formatAsOfET(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" });
  const sameDay =
    d.toLocaleDateString("en-US", { timeZone: "America/New_York" }) === new Date().toLocaleDateString("en-US", { timeZone: "America/New_York" });
  if (sameDay) return `${time} ET`;
  const day = d.toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" });
  return `${day}, ${time} ET`;
}

export type QuoteBadgeKind = "live" | "delayed" | "demo";

export function quoteBadge(q: Pick<Quote, "source" | "asOf" | "provider"> | undefined): { kind: QuoteBadgeKind; label: string; detail: string; when: string } {
  if (!q || q.source === "demo") {
    return { kind: "demo", label: "Demo", detail: "Simulated price for practice — not real market data.", when: "" };
  }
  const when = formatAsOfET(q.asOf);
  const via = q.provider ? ` via ${q.provider === "finnhub" ? "Finnhub" : q.provider === "yahoo" ? "Yahoo Finance" : q.provider}` : "";
  if (q.source === "delayed") {
    return { kind: "delayed", label: "Delayed", detail: `Real price${via} that may lag the market${when ? `, as of ${when}` : ""}.`, when };
  }
  return { kind: "live", label: "Live", detail: `Real market price${via}${when ? `, as of ${when}` : ""}.`, when };
}
