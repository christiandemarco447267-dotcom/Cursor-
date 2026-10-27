// Regression tests for the third QA pass (qa-fixes-3 branch).
import assert from "node:assert/strict";
import { test } from "node:test";
import { computeBuy, computeSell, roundQty } from "./portfolio";
import { createInitialState, loadStateFromString, parseStoredState, serializeState } from "./storage";
import type { AppState } from "./types";

const now = "2026-10-27T15:00:00.000Z";
const idGen = () => "00000000-0000-4000-8000-0000000000bb";

function withTrade(state: AppState, r: { cash: number; holdings: AppState["holdings"] }): AppState {
  return { ...state, cash: r.cash, holdings: r.holdings };
}

// ---- Fractional shares keep their precision -------------------------------------

test("selling part of a fractional lot doesn't invent shares", () => {
  let s = createInitialState();
  s = withTrade(s, computeBuy(s, { symbol: "AAPL", shares: 1.005, price: 100 }, now, idGen));
  const r = computeSell(s, { symbol: "AAPL", shares: 1, price: 100 }, now);
  assert.equal(r.holdings.find((h) => h.symbol === "AAPL")?.shares, 0.005);
});

test("selling part of a tiny fractional lot doesn't delete the rest", () => {
  let s = createInitialState();
  s = withTrade(s, computeBuy(s, { symbol: "AAPL", shares: 0.004, price: 100 }, now, idGen));
  const r = computeSell(s, { symbol: "AAPL", shares: 0.001, price: 100 }, now);
  assert.equal(r.holdings.find((h) => h.symbol === "AAPL")?.shares, 0.003);
});

test("selling the whole fractional lot still removes it", () => {
  let s = createInitialState();
  s = withTrade(s, computeBuy(s, { symbol: "AAPL", shares: 0.1, price: 100 }, now, idGen));
  s = withTrade(s, computeBuy(s, { symbol: "AAPL", shares: 0.2, price: 100 }, now, idGen));
  const r = computeSell(s, { symbol: "AAPL", shares: 0.3, price: 100 }, now);
  assert.equal(r.holdings.find((h) => h.symbol === "AAPL"), undefined);
});

test("average cost isn't rounded to cents, so realized P/L stays exact", () => {
  let s = { ...createInitialState(), cash: 10_000 };
  s = withTrade(s, computeBuy(s, { symbol: "XYZ", shares: 300, price: 10 }, now, idGen));
  s = withTrade(s, computeBuy(s, { symbol: "XYZ", shares: 100, price: 10.01 }, now, idGen));
  const lot = s.holdings.find((h) => h.symbol === "XYZ");
  assert.equal(lot?.avgCost, 10.0025);
  const r = computeSell(s, { symbol: "XYZ", shares: 400, price: 10.01 }, now);
  assert.equal(r.realizedGain, 3); // 300 shares × $0.01; cent-rounded avg cost gave $4
});

test("roundQty keeps 6 decimals", () => {
  assert.equal(roundQty(0.1 + 0.2), 0.3);
  assert.equal(roundQty(1.0000004), 1);
  assert.equal(roundQty(2.1234567), 2.123457);
});

// ---- Unreadable saved data is detectable (so the store can back it up) ---------

test("parseStoredState returns null for corrupt or newer-version data", () => {
  assert.equal(parseStoredState(null), null);
  assert.equal(parseStoredState("{not json"), null);
  assert.equal(parseStoredState(JSON.stringify({ version: 99, holdings: [] })), null);
  // loadStateFromString keeps its old contract: a fresh demo for anything unreadable.
  assert.equal(loadStateFromString("{not json").version, createInitialState().version);
});

test("parseStoredState round-trips a saved state", () => {
  const s = createInitialState();
  const parsed = parseStoredState(serializeState(s));
  assert.ok(parsed);
  assert.equal(parsed.cash, s.cash);
  assert.equal(parsed.holdings.length, s.holdings.length);
});
