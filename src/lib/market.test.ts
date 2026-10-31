import assert from "node:assert/strict";
import { test } from "node:test";
import { DEMO_UNIVERSE, demoQuote, demoSnapshot, nameForSymbol, priceSourceOf, SIM_TICK_MS } from "./market";

test("demoQuote moves over time but keeps a stable previous close", () => {
  const t0 = 1_700_000_000_000;
  const prices = [0, 1, 2, 3, 4, 5].map((i) => demoQuote("AAPL", t0 + i * SIM_TICK_MS).price);
  assert.ok(new Set(prices).size > 1, "prices should vary across ticks (live feed)");

  const a = demoQuote("AAPL", t0);
  const b = demoQuote("AAPL", t0 + SIM_TICK_MS * 10);
  assert.equal(a.previousClose, b.previousClose, "previous close is the day's stable reference");
});

test("demoQuote stays within a sane intraday band", () => {
  const t0 = 1_700_000_000_000;
  for (let i = 0; i < 50; i += 1) {
    const q = demoQuote("MSFT", t0 + i * SIM_TICK_MS);
    assert.ok(Math.abs(q.changePercent) < 5, `changePercent out of band: ${q.changePercent}`);
    assert.ok(q.price > 0);
    assert.equal(q.source, "demo");
  }
});

test("demoSnapshot returns one quote per unique symbol", () => {
  const snap = demoSnapshot(["AAPL", "aapl", "MSFT"], 1_700_000_000_000);
  assert.equal(snap.quotes.length, 2);
  assert.equal(snap.status, "demo");
});

test("priceSourceOf reports simulated vs live feeds", () => {
  const live = { source: "live" as const };
  const demo = { source: "demo" as const };
  assert.equal(priceSourceOf({ status: "loading", quotes: [] }), "pending");
  assert.equal(priceSourceOf({ status: "demo", quotes: [demo] }), "demo");
  assert.equal(priceSourceOf(demoSnapshot(["AAPL", "MSFT"])), "demo");
  assert.equal(priceSourceOf({ status: "open", quotes: [demo, demo] }), "demo");
  assert.equal(priceSourceOf({ status: "error", quotes: [] }), "demo");
  assert.equal(priceSourceOf({ status: "open", quotes: [live, demo] }), "mixed");
  assert.equal(priceSourceOf({ status: "closed", quotes: [live, live] }), "live");
});

test("nameForSymbol names well-known tickers outside the demo universe without adding them to it", () => {
  assert.equal(nameForSymbol("tsla"), "Tesla, Inc.");
  assert.equal(nameForSymbol("GME"), "GameStop Corp.");
  assert.equal(nameForSymbol("BRK.B"), "Berkshire Hathaway Inc. (Class B)");
  assert.equal(nameForSymbol("AAPL"), "Apple Inc.");
  assert.equal(nameForSymbol("ZZZQ"), "ZZZQ");
  assert.ok(!DEMO_UNIVERSE.some((e) => e.symbol === "TSLA"));
});
