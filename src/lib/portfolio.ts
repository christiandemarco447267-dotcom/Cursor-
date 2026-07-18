import type { AppState, Quote } from "@/lib/types";

export type HoldingValue = {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  price: number;
  marketValue: number;
  costBasis: number;
  gain: number;
  gainPercent: number;
};

export type PortfolioSummary = {
  cash: number;
  investments: number;
  total: number;
  costBasis: number;
  gain: number;
  gainPercent: number;
  holdings: HoldingValue[];
};

export function summarizePortfolio(
  state: AppState,
  quotes: Quote[],
): PortfolioSummary {
  const priceMap = new Map(quotes.map((q) => [q.symbol.toUpperCase(), q.price]));
  const holdings: HoldingValue[] = state.holdings.map((h) => {
    const price = priceMap.get(h.symbol.toUpperCase()) ?? h.avgCost;
    const marketValue = price * h.shares;
    const costBasis = h.avgCost * h.shares;
    const gain = marketValue - costBasis;
    const gainPercent = costBasis > 0 ? (gain / costBasis) * 100 : 0;
    return {
      id: h.id,
      symbol: h.symbol,
      name: h.name,
      shares: h.shares,
      avgCost: h.avgCost,
      price,
      marketValue,
      costBasis,
      gain,
      gainPercent,
    };
  });

  const investments = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const costBasis = holdings.reduce((sum, h) => sum + h.costBasis, 0);
  const gain = investments - costBasis;
  const gainPercent = costBasis > 0 ? (gain / costBasis) * 100 : 0;

  return {
    cash: state.cash,
    investments,
    total: state.cash + investments,
    costBasis,
    gain,
    gainPercent,
    holdings: holdings.sort((a, b) => b.marketValue - a.marketValue),
  };
}

export function allocationSlices(summary: PortfolioSummary): {
  label: string;
  value: number;
  percent: number;
}[] {
  const total = summary.total || 1;
  const bySymbol = summary.holdings.map((h) => ({
    label: h.symbol,
    value: h.marketValue,
    percent: (h.marketValue / total) * 100,
  }));
  return [
    ...bySymbol,
    {
      label: "Cash",
      value: summary.cash,
      percent: (summary.cash / total) * 100,
    },
  ].filter((s) => s.value > 0);
}
