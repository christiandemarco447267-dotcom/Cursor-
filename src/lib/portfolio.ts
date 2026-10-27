import { formatCurrency, formatNumber } from "./format";
import { nameForSymbol } from "./market";
import type { AppState, Holding, Quote } from "./types";
import { LIMITS, normalizeSymbol } from "./validation";

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

/**
 * Share counts and per-share cost basis keep 6 decimals. Rounding them to cents
 * (as money is) loses or invents fractional shares on a sell (1.005 − 1 became
 * 0.01; 0.004 − 0.001 removed the lot) and drifts the average cost, which then
 * skews realized P/L on large positions.
 */
export function roundQty(value: number): number {
  return Math.round(value * 1e6) / 1e6;
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
  if (!Number.isFinite(input.shares) || input.shares <= 0) {
    throw new TradeError("Enter a positive number of shares.");
  }
  // A fill at $0 would hand out free shares (buy) or throw them away (sell).
  if (!Number.isFinite(input.price) || input.price <= 0 || input.price > LIMITS.maxPrice) {
    throw new TradeError("Enter a price per share above $0.");
  }
  const cost = round2(input.shares * input.price);
  if (cost > state.cash + 1e-9) {
    throw new TradeError(`Not enough cash. This buy costs ${formatCurrency(cost)} but only ${formatCurrency(state.cash)} is available.`);
  }

  const holdings = [...state.holdings];
  const index = holdings.findIndex((h) => normalizeSymbol(h.symbol) === symbol);
  if (index >= 0) {
    const existing = holdings[index];
    const totalShares = roundQty(existing.shares + input.shares);
    if (totalShares > LIMITS.maxShares) {
      throw new TradeError("That would exceed the maximum position size.");
    }
    const avgCost = roundQty((existing.shares * existing.avgCost + input.shares * input.price) / totalShares);
    holdings[index] = { ...existing, shares: totalShares, avgCost, updatedAt: now };
  } else {
    holdings.push({
      id: newId(),
      symbol,
      name: nameForSymbol(symbol),
      shares: input.shares,
      avgCost: roundQty(input.price),
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
  if (!Number.isFinite(input.shares) || input.shares <= 0) {
    throw new TradeError("Enter a positive number of shares.");
  }
  // A fill at $0 would hand out free shares (buy) or throw them away (sell).
  if (!Number.isFinite(input.price) || input.price <= 0 || input.price > LIMITS.maxPrice) {
    throw new TradeError("Enter a price per share above $0.");
  }
  const holdings = [...state.holdings];
  const index = holdings.findIndex((h) => normalizeSymbol(h.symbol) === symbol);
  if (index < 0) {
    throw new TradeError(`You don't hold any ${symbol}.`);
  }
  const existing = holdings[index];
  if (input.shares > existing.shares + 1e-9) {
    throw new TradeError(`You only hold ${formatNumber(existing.shares)} ${symbol}, so you can't sell ${formatNumber(input.shares)}.`);
  }

  const proceeds = round2(input.shares * input.price);
  const realizedGain = round2((input.price - existing.avgCost) * input.shares);
  const remaining = roundQty(existing.shares - input.shares);
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
