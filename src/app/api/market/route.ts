import { NextResponse } from "next/server";
import { z } from "zod";
import { demoQuote, marketStatusNow, uniqueSymbols } from "@/lib/market";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import type { MarketSnapshot, Quote } from "@/lib/types";

export const dynamic = "force-dynamic";

const SymbolsSchema = z
  .string()
  .max(200)
  .optional()
  .transform((value) => (value ? value.split(",") : []));

const DEFAULT_SYMBOLS = ["VTI", "VOO", "VXUS", "BND", "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "SCHD"];

async function fetchFinnhubQuote(symbol: string, apiKey: string): Promise<Quote> {
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000), cache: "no-store" });
    if (!res.ok) throw new Error(`Finnhub responded ${res.status}`);
    const data = (await res.json()) as { c?: number; pc?: number };
    if (!data.c || !data.pc) throw new Error("Missing price data");
    const changePercent = ((data.c - data.pc) / data.pc) * 100;
    return {
      symbol,
      price: round2(data.c),
      previousClose: round2(data.pc),
      changePercent: round2(changePercent),
      source: "live",
    };
  } catch (error) {
    // Fall back to a live-simulated quote so a partial outage never blanks the UI.
    return { ...demoQuote(symbol), error: error instanceof Error ? error.message : "quote failed" };
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  const limit = rateLimit(`market:${clientKey(request)}`);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = SymbolsSchema.safeParse(searchParams.get("symbols") ?? undefined);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid symbols parameter." }, { status: 400 });
  }

  const requested = uniqueSymbols(parsed.data.length ? parsed.data : DEFAULT_SYMBOLS).slice(0, 20);
  const apiKey = process.env.FINNHUB_API_KEY;
  const now = Date.now();

  let snapshot: MarketSnapshot;
  if (apiKey) {
    const quotes = await Promise.all(requested.map((symbol) => fetchFinnhubQuote(symbol, apiKey)));
    const anyLive = quotes.some((q) => q.source === "live");
    snapshot = {
      status: anyLive ? marketStatusNow() : "demo",
      updatedAt: new Date(now).toISOString(),
      quotes,
    };
  } else {
    snapshot = {
      status: "demo",
      updatedAt: new Date(now).toISOString(),
      quotes: requested.map((symbol) => demoQuote(symbol, now)),
    };
  }

  return NextResponse.json(snapshot, {
    // Realtime: don't cache so each poll reflects the latest prices.
    headers: { "Cache-Control": "no-store" },
  });
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
