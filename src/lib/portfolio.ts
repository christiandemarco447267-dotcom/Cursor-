import type { Goal, Holding } from "@/lib/types";

export type PortfolioSummary = {
  marketValue: number;
  costBasis: number;
  gain: number;
  gainPct: number;
  allocation: Array<{
    assetClass: Holding["assetClass"];
    value: number;
    weight: number;
  }>;
};

export function holdingValue(holding: Holding): number {
  return holding.shares * holding.lastPrice;
}

export function holdingCost(holding: Holding): number {
  return holding.shares * holding.avgCost;
}

export function summarizePortfolio(holdings: Holding[]): PortfolioSummary {
  const marketValue = holdings.reduce((sum, h) => sum + holdingValue(h), 0);
  const costBasis = holdings.reduce((sum, h) => sum + holdingCost(h), 0);
  const gain = marketValue - costBasis;
  const gainPct = costBasis === 0 ? 0 : gain / costBasis;

  const byClass = new Map<Holding["assetClass"], number>();
  for (const holding of holdings) {
    const value = holdingValue(holding);
    byClass.set(holding.assetClass, (byClass.get(holding.assetClass) ?? 0) + value);
  }

  const allocation = [...byClass.entries()]
    .map(([assetClass, value]) => ({
      assetClass,
      value,
      weight: marketValue === 0 ? 0 : value / marketValue,
    }))
    .sort((a, b) => b.value - a.value);

  return { marketValue, costBasis, gain, gainPct, allocation };
}

export function primaryGoalProgress(
  goals: Goal[],
  marketValue: number,
): { goal: Goal | null; progress: number } {
  const goal = goals[0] ?? null;
  if (!goal || goal.targetAmount <= 0) {
    return { goal, progress: 0 };
  }
  const current = Math.max(goal.currentAmount, marketValue);
  return { goal, progress: Math.min(1, current / goal.targetAmount) };
}

export function applyQuotePrices(
  holdings: Holding[],
  quotes: Record<string, number>,
): Holding[] {
  return holdings.map((holding) => {
    if (holding.assetClass === "cash") return holding;
    const next = quotes[holding.symbol.toUpperCase()];
    if (typeof next !== "number" || !Number.isFinite(next) || next <= 0) {
      return holding;
    }
    return { ...holding, lastPrice: next };
  });
}
