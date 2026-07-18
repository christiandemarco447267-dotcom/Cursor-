import { createDemoState } from "@/lib/demo-data";

const demoPrices = (): Record<string, number> => {
  const map: Record<string, number> = {};
  for (const holding of createDemoState().holdings) {
    map[holding.symbol.toUpperCase()] = holding.lastPrice;
  }
  return map;
};

/**
 * Fetch quotes server-side only.
 * Prefer Finnhub when FINNHUB_API_KEY is set; otherwise return demo prices.
 * Never expose API keys to the client.
 */
export async function fetchQuotes(
  symbols: string[],
): Promise<{ quotes: Record<string, number>; source: "live" | "demo" }> {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const key = process.env.FINNHUB_API_KEY?.trim();

  if (!key) {
    const demo = demoPrices();
    const quotes: Record<string, number> = {};
    for (const symbol of unique) {
      if (demo[symbol] != null) quotes[symbol] = demo[symbol];
    }
    return { quotes, source: "demo" };
  }

  const quotes: Record<string, number> = {};
  await Promise.all(
    unique.map(async (symbol) => {
      if (symbol === "USD") {
        quotes[symbol] = 1;
        return;
      }
      try {
        const url = new URL("https://finnhub.io/api/v1/quote");
        url.searchParams.set("symbol", symbol);
        url.searchParams.set("token", key);
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          next: { revalidate: 60 },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { c?: number };
        if (typeof data.c === "number" && data.c > 0) {
          quotes[symbol] = data.c;
        }
      } catch {
        // fall through to demo fill
      }
    }),
  );

  const demo = demoPrices();
  for (const symbol of unique) {
    if (quotes[symbol] == null && demo[symbol] != null) {
      quotes[symbol] = demo[symbol];
    }
  }

  return {
    quotes,
    source: Object.keys(quotes).length ? "live" : "demo",
  };
}
