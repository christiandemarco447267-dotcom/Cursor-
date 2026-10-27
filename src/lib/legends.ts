// Compare the user's holdings with a legend portfolio (pure; unit-tested).
import type { LegendPortfolio } from "../data/legends";
import { sectorWeights, type Sector } from "./sectors";
import { normalizeSymbol } from "./validation";

/** Share classes of the same company count as one issuer for overlap. */
const ISSUER_ALIAS: Record<string, string> = { GOOG: "GOOGL", "BRK-B": "BRK.B", "BRK.A": "BRK.B" };

export function issuerKey(symbol: string): string {
  const s = normalizeSymbol(symbol);
  return ISSUER_ALIAS[s] ?? s;
}

export type Weighted = { symbol: string; weight: number };

/** Normalize to percentages summing to 100, merging share classes. */
export function normalizeWeights(items: Weighted[]): Map<string, number> {
  const map = new Map<string, number>();
  let total = 0;
  for (const i of items) {
    if (!(i.weight > 0)) continue;
    const k = issuerKey(i.symbol);
    map.set(k, (map.get(k) ?? 0) + i.weight);
    total += i.weight;
  }
  if (total > 0) for (const [k, v] of map) map.set(k, (v / total) * 100);
  return map;
}

export type Concentration = { top1: number; top5: number; effectiveHoldings: number; count: number };

export function concentration(weights: Map<string, number>): Concentration {
  const sorted = [...weights.values()].sort((a, b) => b - a);
  const sumSq = sorted.reduce((s, w) => s + (w / 100) ** 2, 0);
  return {
    top1: sorted[0] ?? 0,
    top5: sorted.slice(0, 5).reduce((s, w) => s + w, 0),
    effectiveHoldings: sumSq > 0 ? 1 / sumSq : 0,
    count: sorted.length,
  };
}

export type SectorRow = { sector: Sector; you: number; legend: number };

export type LegendComparison = {
  /** Weight-based overlap: Σ min(your weight, legend weight) per issuer, 0–100. */
  overlapPct: number;
  shared: { symbol: string; you: number; legend: number }[];
  sectors: SectorRow[];
  you: Concentration;
  legend: Concentration;
};

/**
 * `positions` are the user's holdings by market value (cash excluded, so this
 * compares what you *invest in*). Legend weights cover only listed holdings and
 * are renormalized to 100 (a 13F's small "other" positions are left out).
 */
export function compareWithLegend(positions: { symbol: string; value: number }[], legend: LegendPortfolio): LegendComparison {
  const you = normalizeWeights(positions.map((p) => ({ symbol: p.symbol, weight: p.value })));
  const them = normalizeWeights(legend.holdings.map((h) => ({ symbol: h.symbol, weight: h.weight })));
  let overlap = 0;
  const shared: LegendComparison["shared"] = [];
  for (const [k, w] of you) {
    const lw = them.get(k);
    if (lw === undefined) continue;
    overlap += Math.min(w, lw);
    shared.push({ symbol: k, you: w, legend: lw });
  }
  shared.sort((a, b) => b.legend - a.legend);

  const toPositions = (m: Map<string, number>) => [...m].map(([symbol, value]) => ({ symbol, value }));
  const ys = sectorWeights(toPositions(you));
  const ls = sectorWeights(toPositions(them));
  const sectorsSet = new Set<Sector>([...ys.map((s) => s.sector), ...ls.map((s) => s.sector)]);
  const sectors: SectorRow[] = [...sectorsSet]
    .map((sector) => ({
      sector,
      you: ys.find((s) => s.sector === sector)?.percent ?? 0,
      legend: ls.find((s) => s.sector === sector)?.percent ?? 0,
    }))
    .sort((a, b) => Math.max(b.you, b.legend) - Math.max(a.you, a.legend));

  return { overlapPct: Math.min(100, overlap), shared, sectors, you: concentration(you), legend: concentration(them) };
}
