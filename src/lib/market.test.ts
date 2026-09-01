import assert from "node:assert/strict";
import { test } from "node:test";
import { demoQuote, demoSnapshot, SIM_TICK_MS } from "./market";

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
