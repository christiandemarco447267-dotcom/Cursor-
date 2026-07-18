import type { MarketSnapshot, Quote } from "@/lib/types";

export const DEMO_UNIVERSE = [
  { symbol: "VTI", name: "Vanguard Total Stock Market ETF", price: 268.4, changePercent: 0.42 },
  { symbol: "VXUS", name: "Vanguard Total International Stock ETF", price: 64.15, changePercent: -0.18 },
  { symbol: "BND", name: "Vanguard Total Bond Market ETF", price: 73.22, changePercent: 0.08 },
  { symbol: "VOO", name: "Vanguard S&P 500 ETF", price: 542.1, changePercent: 0.55 },
  { symbol: "QQQ", name: "Invesco QQQ Trust", price: 498.75, changePercent: 0.91 },
  { symbol: "AAPL", name: "Apple Inc.", price: 214.32, changePercent: 0.64 },
  { symbol: "MSFT", name: "Microsoft Corporation", price: 428.9, changePercent: 0.37 },
  { symbol: "NVDA", name: "NVIDIA Corporation", price: 131.45, changePercent: 1.82 },
  { symbol: "AMZN", name: "Amazon.com Inc.", price: 198.12, changePercent: -0.22 },
  { symbol: "GOOGL", name: "Alphabet Inc.", price: 176.55, changePercent: 0.29 },
] as const;

export function demoQuotes(symbols?: string[]): Quote[] {
  const wanted = symbols?.map((s) => s.toUpperCase());
  const rows = wanted
    ? DEMO_UNIVERSE.filter((q) => wanted.includes(q.symbol))
    : DEMO_UNIVERSE;

  return rows.map((q) => ({
    symbol: q.symbol,
    price: q.price,
    changePercent: q.changePercent,
    previousClose: Number((q.price / (1 + q.changePercent / 100)).toFixed(2)),
    source: "demo" as const,
  }));
}

export function demoSnapshot(symbols?: string[]): MarketSnapshot {
  return {
    status: "demo",
    updatedAt: new Date().toISOString(),
    quotes: demoQuotes(symbols),
  };
}

export function nameForSymbol(symbol: string): string {
  const hit = DEMO_UNIVERSE.find((q) => q.symbol === symbol.toUpperCase());
  return hit?.name ?? symbol.toUpperCase();
}

/** Deterministic sparkline values for charts (stable across renders). */
export function sparklineForSymbol(symbol: string, points = 24): number[] {
  let seed = 0;
  for (const ch of symbol) seed = (seed * 31 + ch.charCodeAt(0)) % 1000;
  const out: number[] = [];
  let v = 100 + (seed % 20);
  for (let i = 0; i < points; i++) {
    seed = (seed * 1103515245 + 12345) % 2147483647;
    const delta = ((seed % 100) - 45) / 80;
    v = Math.max(20, v + delta);
    out.push(Number(v.toFixed(2)));
  }
  return out;
}
