import assert from "node:assert/strict";
import { test } from "node:test";
import { biasReport, closedTrades, detectBiasEvents, dispositionEffect, previewTradeBiases } from "./biases";
import type { Transaction } from "./types";

const T0 = Date.parse("2026-10-01T14:00:00Z");
const H = 3_600_000;
let seq = 0;
function tx(type: "buy" | "sell", symbol: string, hours: number, price: number, extra: Partial<Transaction> = {}): Transaction {
  seq += 1;
  return {
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`,
    type,
    symbol,
    shares: 10,
    price,
    amount: 10 * price,
    cashAfter: 1000,
    note: "",
    createdAt: new Date(T0 + hours * H).toISOString(),
    ...extra,
  };
}

test("FOMO: buying on a +3% day, or at a fresh recent high after a run-up", () => {
  const events = detectBiasEvents([
    tx("buy", "NVDA", 0, 100, { dayChange: 4.2 }),
    tx("buy", "AAPL", 1, 100, { dayChange: 0.5 }),
    tx("buy", "AAPL", 48, 104, { dayChange: 0.2 }),
    tx("buy", "AAPL", 96, 108, { dayChange: 0.1 }), // new high, +8% vs low
  ]);
  const fomo = events.filter((e) => e.bias === "fomo");
  assert.equal(fomo.length, 2);
  assert.equal(fomo[0].symbol, "NVDA");
  assert.equal(fomo[1].symbol, "AAPL");
});

test("seeded opening positions are never flagged", () => {
  const events = detectBiasEvents([tx("buy", "VTI", 0, 100, { dayChange: 9, note: "Opening position" })]);
  assert.equal(events.length, 0);
});

test("revenge trade: a buy within 24h of a realized loss", () => {
  const events = detectBiasEvents([
    tx("buy", "TSLA", 0, 200),
    tx("sell", "TSLA", 5, 180, { realizedGain: -200 }),
    tx("buy", "GME", 10, 20),
    tx("buy", "AMD", 40, 20), // >24h after the loss
  ]);
  const revenge = events.filter((e) => e.bias === "revenge");
  assert.equal(revenge.length, 1);
  assert.equal(revenge[0].symbol, "GME");
});

test("panic sell: selling at a loss on a −3% day (not at a gain)", () => {
  const events = detectBiasEvents([
    tx("buy", "XOM", 0, 100),
    tx("sell", "XOM", 50, 90, { dayChange: -4, realizedGain: -100, shares: 5 }),
    tx("sell", "XOM", 100, 120, { dayChange: -5, realizedGain: 100, shares: 5 }),
  ]);
  assert.equal(events.filter((e) => e.bias === "panic").length, 1);
});

test("overtrading: 6 trades inside 24h, flagged once per window", () => {
  const list = Array.from({ length: 8 }, (_, i) => tx("buy", "SPY", i * 2, 500));
  const events = detectBiasEvents(list).filter((e) => e.bias === "overtrading");
  assert.equal(events.length, 1);
});

test("disposition effect: losers held longer than winners", () => {
  const list = [
    tx("buy", "AAA", 0, 10),
    tx("sell", "AAA", 24, 12, { realizedGain: 20 }), // winner held 1 day
    tx("buy", "BBB", 0, 10),
    tx("sell", "BBB", 24 * 10, 8, { realizedGain: -20 }), // loser held 10 days
  ];
  const closed = closedTrades(list);
  assert.equal(closed.length, 2);
  const d = dispositionEffect(closed);
  assert.equal(d.flagged, true);
  assert.ok((d.avgLoserHoldDays ?? 0) > (d.avgWinnerHoldDays ?? 0));
  assert.equal(d.lingeringLosers.length, 1);
  assert.equal(dispositionEffect(closed.slice(0, 1)).flagged, false);
});

test("biasReport counts only the last 30 days", () => {
  const now = T0 + 40 * 24 * H;
  const old = tx("buy", "NVDA", 0, 100, { dayChange: 5 });
  const recent = tx("buy", "MSFT", 35 * 24, 100, { dayChange: 5 });
  const report = biasReport([old, recent], now, 30);
  assert.equal(report.counts.fomo, 1);
  assert.equal(report.trades, 1);
  assert.equal(report.total, 1);
});

test("previewTradeBiases nudges before a trade without recording anything", () => {
  const history = [tx("buy", "TSLA", 0, 200), tx("sell", "TSLA", 2, 150, { realizedGain: -500 })];
  const nudges = previewTradeBiases(history, { side: "buy", symbol: "gme", shares: 1, price: 30, dayChange: 12 }, T0 + 3 * H);
  const keys = nudges.map((n) => n.bias).sort();
  assert.deepEqual(keys, ["fomo", "revenge"]);
  assert.match(nudges[0].body, /Buying|after/);
  const panic = previewTradeBiases(history, { side: "sell", symbol: "AAPL", shares: 1, price: 90, avgCost: 100, dayChange: -6 }, T0 + 3 * H);
  assert.deepEqual(panic.map((n) => n.bias), ["panic"]);
  assert.equal(history.length, 2);
});
