import { NextResponse } from "next/server";
import { z } from "zod";
import { demoSnapshot, DEMO_UNIVERSE } from "@/lib/market";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import type { MarketSnapshot, Quote } from "@/lib/types";

export const runtime = "nodejs";

const QuerySchema = z.object({
  symbols: z
    .string()
    .max(200)
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean)
            .slice(0, 20)
        : undefined,
    ),
});

async function fetchFinnhubQuotes(symbols: string[], token: string): Promise<Quote[] | null> {
  try {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(token)}`,
          { next: { revalidate: 60 } },
        );
        if (!res.ok) return null;
        const data = (await res.json()) as {
          c?: number;
          pc?: number;
          dp?: number;
        };
        if (!data.c || data.c <= 0) return null;
        return {
          symbol,
          price: data.c,
          previousClose: data.pc ?? data.c,
          changePercent: data.dp ?? 0,
          source: "live" as const,
        };
      }),
    );
    const quotes = results.filter(
      (q): q is Extract<Quote, { source: "live" }> => q !== null,
    );
    return quotes.length ? quotes : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const limited = rateLimit(`market:${clientKey(request)}`, 90, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    symbols: url.searchParams.get("symbols") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid symbols parameter" }, { status: 400 });
  }

  const symbols =
    parsed.data.symbols ?? DEMO_UNIVERSE.map((q) => q.symbol);

  const token = process.env.FINNHUB_API_KEY?.trim();
  if (token) {
    const live = await fetchFinnhubQuotes(symbols, token);
    if (live) {
      const snapshot: MarketSnapshot = {
        status: "open",
        updatedAt: new Date().toISOString(),
        quotes: live,
      };
      return NextResponse.json(snapshot, {
        headers: { "Cache-Control": "private, max-age=30" },
      });
    }
  }

  return NextResponse.json(demoSnapshot(symbols), {
    headers: { "Cache-Control": "private, max-age=30" },
  });
}
