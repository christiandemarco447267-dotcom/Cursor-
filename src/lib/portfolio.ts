import { nameForSymbol } from "./market";
import type { AppState, Holding, Quote } from "./types";
import { normalizeSymbol } from "./validation";

export type HoldingValue = {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  price: number;
  hasQuote: boolean;
  marketValue: number;
  costBasis: number;
  gain: number;
  gainPercent: number;
  thesisId?: string;
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

export type AllocationSlice = {
  key: string;
  label: string;
  value: number;
  percent: number;
};

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function quoteMap(quotes: Quote[]): Map<string, Quote> {
  const map = new Map<string, Quote>();
  for (const quote of quotes) map.set(normalizeSymbol(quote.symbol), quote);
  return map;
}

export function summarizePortfolio(state: AppState, quotes: Quote[]): PortfolioSummary {
  const prices = quoteMap(quotes);
  const holdings: HoldingValue[] = state.holdings.map((holding) => {
    const quote = prices.get(normalizeSymbol(holding.symbol));
    const hasQuote = Boolean(quote);
    const price = quote ? quote.price : holding.avgCost;
    const marketValue = price * holding.shares;
    const costBasis = holding.avgCost * holding.shares;
    const gain = marketValue - costBasis;
    const gainPercent = costBasis > 0 ? (gain / costBasis) * 100 : 0;
    return {
      id: holding.id,
      symbol: holding.symbol,
      name: holding.name,
      shares: holding.shares,
      avgCost: holding.avgCost,
      price,
      hasQuote,
      marketValue,
      costBasis,
      gain,
      gainPercent,
      thesisId: holding.thesisId,
    };
  });

  holdings.sort((a, b) => b.marketValue - a.marketValue);

  const investments = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const costBasis = holdings.reduce((sum, h) => sum + h.costBasis, 0);
  const gain = investments - costBasis;
  const total = state.cash + investments;
  const gainPercent = costBasis > 0 ? (gain / costBasis) * 100 : 0;

  return {
    cash: state.cash,
    investments,
    total,
    costBasis,
    gain,
    gainPercent,
    holdings,
  };
}

export function allocationSlices(summary: PortfolioSummary): AllocationSlice[] {
  const total = Math.max(summary.total, 1);
  const slices: AllocationSlice[] = summary.holdings.map((h) => ({
    key: h.id,
    label: h.symbol,
    value: h.marketValue,
    percent: (h.marketValue / total) * 100,
  }));
  if (summary.cash > 0) {
    slices.push({ key: "cash", label: "Cash", value: summary.cash, percent: (summary.cash / total) * 100 });
  }
  return slices.filter((slice) => slice.value > 0).sort((a, b) => b.value - a.value);
}

export function realizedPnl(state: AppState): number {
  return state.transactions.reduce((sum, tx) => sum + (tx.realizedGain ?? 0), 0);
}

export class TradeError extends Error {}

type TradeResult = { cash: number; holdings: Holding[]; realizedGain: number };

/** Pure buy: merges into an existing lot with weighted-average cost. Throws on insufficient cash. */
export function computeBuy(
  state: AppState,
  input: { symbol: string; shares: number; price: number },
  now: string,
  newId: () => string,
): TradeResult {
  const symbol = normalizeSymbol(input.symbol);
  const cost = round2(input.shares * input.price);
  if (cost > state.cash + 1e-9) {
    throw new TradeError(`Not enough cash. This buy costs ${cost.toFixed(2)} but only ${state.cash.toFixed(2)} is available.`);
  }

  const holdings = [...state.holdings];
  const index = holdings.findIndex((h) => normalizeSymbol(h.symbol) === symbol);
  if (index >= 0) {
    const existing = holdings[index];
    const totalShares = existing.shares + input.shares;
    const avgCost = round2((existing.shares * existing.avgCost + input.shares * input.price) / totalShares);
    holdings[index] = { ...existing, shares: totalShares, avgCost, updatedAt: now };
  } else {
    holdings.push({
      id: newId(),
      symbol,
      name: nameForSymbol(symbol),
      shares: input.shares,
      avgCost: round2(input.price),
      createdAt: now,
      updatedAt: now,
    });
  }

  return { cash: round2(state.cash - cost), holdings, realizedGain: 0 };
}

/** Pure sell: reduces/removes a lot and realizes P/L. Throws when shares are insufficient. */
export function computeSell(
  state: AppState,
  input: { symbol: string; shares: number; price: number },
  now: string,
): TradeResult {
  const symbol = normalizeSymbol(input.symbol);
  const holdings = [...state.holdings];
  const index = holdings.findIndex((h) => normalizeSymbol(h.symbol) === symbol);
  if (index < 0) {
    throw new TradeError(`You don't hold any ${symbol}.`);
  }
  const existing = holdings[index];
  if (input.shares > existing.shares + 1e-9) {
    throw new TradeError(`You only hold ${existing.shares} ${symbol}, cannot sell ${input.shares}.`);
  }

  const proceeds = round2(input.shares * input.price);
  const realizedGain = round2((input.price - existing.avgCost) * input.shares);
  const remaining = round2(existing.shares - input.shares);
  if (remaining <= 1e-9) {
    holdings.splice(index, 1);
  } else {
    holdings[index] = { ...existing, shares: remaining, updatedAt: now };
  }

  return { cash: round2(state.cash + proceeds), holdings, realizedGain };
}

export function portfolioSymbols(state: AppState): string[] {
  return state.holdings.map((h) => normalizeSymbol(h.symbol));
}
