import assert from "node:assert/strict";
import { test } from "node:test";
import {
  allocationSlices,
  computeBuy,
  computeSell,
  summarizePortfolio,
  TradeError,
} from "./portfolio";
import { createInitialState } from "./storage";
import type { AppState, Quote } from "./types";

function emptyState(cash = 10_000): AppState {
  const base = createInitialState();
  return { ...base, cash, holdings: [], transactions: [] };
}

const now = "2026-01-01T00:00:00.000Z";
const id = () => "00000000-0000-4000-8000-000000000000";

test("summarizePortfolio values holdings with quotes and aggregates totals", () => {
  const base = emptyState(1000);
  const state: AppState = {
    ...base,
    holdings: [
      { id: id(), symbol: "AAA", name: "AAA", shares: 10, avgCost: 100, createdAt: now, updatedAt: now },
    ],
  };
  const quotes: Quote[] = [{ symbol: "AAA", price: 110, previousClose: 100, changePercent: 10, source: "demo" }];
  const summary = summarizePortfolio(state, quotes);
  assert.equal(summary.investments, 1100);
  assert.equal(summary.total, 2100);
  assert.equal(summary.gain, 100);
  assert.ok(Math.abs(summary.gainPercent - 10) < 1e-9);
});

test("summarizePortfolio falls back to avg cost when a quote is missing", () => {
  const state: AppState = {
    ...emptyState(0),
    holdings: [{ id: id(), symbol: "ZZZ", name: "ZZZ", shares: 5, avgCost: 20, createdAt: now, updatedAt: now }],
  };
  const summary = summarizePortfolio(state, []);
  assert.equal(summary.investments, 100);
  assert.equal(summary.gain, 0);
  assert.equal(summary.holdings[0].hasQuote, false);
});

test("computeBuy merges into an existing lot with weighted-average cost", () => {
  let state = emptyState(10_000);
  const first = computeBuy(state, { symbol: "AAPL", shares: 10, price: 100 }, now, id);
  state = { ...state, cash: first.cash, holdings: first.holdings };
  assert.equal(first.cash, 9_000);

  const second = computeBuy(state, { symbol: "AAPL", shares: 10, price: 200 }, now, id);
  assert.equal(second.holdings.length, 1);
  assert.equal(second.holdings[0].shares, 20);
  assert.equal(second.holdings[0].avgCost, 150); // (10*100 + 10*200)/20
  assert.equal(second.cash, 7_000);
});

test("computeBuy rejects when cash is insufficient", () => {
  const state = emptyState(50);
  assert.throws(() => computeBuy(state, { symbol: "AAPL", shares: 1, price: 100 }, now, id), TradeError);
});

test("computeBuy rejects invalid shares/price", () => {
  const state = emptyState(10_000);
  assert.throws(() => computeBuy(state, { symbol: "AAPL", shares: 0, price: 100 }, now, id), TradeError);
  assert.throws(() => computeBuy(state, { symbol: "AAPL", shares: -5, price: 100 }, now, id), TradeError);
  assert.throws(() => computeBuy(state, { symbol: "AAPL", shares: NaN, price: 100 }, now, id), TradeError);
  assert.throws(() => computeBuy(state, { symbol: "AAPL", shares: 1, price: -1 }, now, id), TradeError);
});

test("computeSell realizes P/L, credits cash, and removes an emptied lot", () => {
  let state = emptyState(0);
  state = { ...state, holdings: computeBuy(emptyState(2000), { symbol: "MSFT", shares: 10, price: 100 }, now, id).holdings, cash: 1000 };

  const result = computeSell(state, { symbol: "MSFT", shares: 10, price: 130 }, now);
  assert.equal(result.realizedGain, 300); // (130-100)*10
  assert.equal(result.cash, 1000 + 1300);
  assert.equal(result.holdings.length, 0);
});

test("computeSell rejects selling more than held", () => {
  const state = { ...emptyState(0), holdings: computeBuy(emptyState(2000), { symbol: "MSFT", shares: 5, price: 100 }, now, id).holdings };
  assert.throws(() => computeSell(state, { symbol: "MSFT", shares: 10, price: 100 }, now), TradeError);
});

test("computeSell rejects invalid shares", () => {
  const state = { ...emptyState(0), holdings: computeBuy(emptyState(2000), { symbol: "MSFT", shares: 5, price: 100 }, now, id).holdings };
  assert.throws(() => computeSell(state, { symbol: "MSFT", shares: 0, price: 100 }, now), TradeError);
  assert.throws(() => computeSell(state, { symbol: "MSFT", shares: -1, price: 100 }, now), TradeError);
});

test("allocationSlices includes cash and sums to ~100%", () => {
  const state: AppState = {
    ...emptyState(500),
    holdings: [{ id: id(), symbol: "AAA", name: "AAA", shares: 5, avgCost: 100, createdAt: now, updatedAt: now }],
  };
  const summary = summarizePortfolio(state, [{ symbol: "AAA", price: 100, previousClose: 100, changePercent: 0, source: "demo" }]);
  const slices = allocationSlices(summary);
  const totalPercent = slices.reduce((sum, s) => sum + s.percent, 0);
  assert.ok(slices.some((s) => s.key === "cash"));
  assert.ok(Math.abs(totalPercent - 100) < 1e-6);
});
