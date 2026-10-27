import assert from "node:assert/strict";
import { test } from "node:test";
import {
  benchmarkSeries,
  benchmarkStats,
  capSnapshots,
  maxDrawdownPct,
  maybeRecordSnapshot,
  SNAPSHOT_INTERVAL_MS,
  winRate,
} from "./benchmark";
import { processMarketTick } from "./market-tick";
import { placeOrder } from "./orders";
import { buy, createInitialState, deposit, sell } from "./storage";
import { AppStateSchema, type PerfSnapshot, type Quote } from "./types";

const q = (symbol: string, price: number): Quote => ({ symbol, price, previousClose: price, changePercent: 0, source: "demo" });
const snap = (t: number, value: number, spy: number, flow = 0): PerfSnapshot => ({
  t: new Date(1_700_000_000_000 + t * 60_000).toISOString(),
  value,
  spy,
  flow,
});

test("benchmarkSeries indexes both lines to 100 and neutralizes deposits", () => {
  const series = benchmarkSeries([snap(0, 1000, 500), snap(1, 1100, 550), snap(2, 2100, 550, 1000)]);
  assert.equal(series[0].portfolio, 100);
  assert.equal(series[0].spy, 100);
  assert.ok(Math.abs(series[1].portfolio - 110) < 1e-9);
  assert.ok(Math.abs(series[1].spy - 110) < 1e-9);
  // The $1,000 deposit is not counted as performance.
  assert.ok(Math.abs(series[2].portfolio - 110) < 1e-9);
});

test("maxDrawdownPct and winRate", () => {
  assert.equal(maxDrawdownPct([100, 120, 90, 130, 117]), 25);
  assert.equal(maxDrawdownPct([100, 101, 102]), 0);

  let s = buy(createInitialState(), { symbol: "AAPL", shares: 10, price: 100 });
  s = sell(s, { symbol: "AAPL", shares: 5, price: 120 }); // win
  s = sell(s, { symbol: "AAPL", shares: 5, price: 90 }); // loss
  s = sell(s, { symbol: "VTI", shares: 1, price: 300 }); // win
  const wr = winRate(s.transactions);
  assert.equal(wr.closed, 3);
  assert.equal(wr.wins, 2);
  assert.ok(Math.abs((wr.percent ?? 0) - 66.6667) < 0.01);
  assert.equal(winRate(createInitialState().transactions).percent, null);
});

test("benchmarkStats reports returns, outperformance and drawdown", () => {
  const stats = benchmarkStats([snap(0, 1000, 500), snap(1, 900, 510), snap(2, 1200, 520)], []);
  assert.ok(Math.abs(stats.totalReturnPct - 20) < 1e-9);
  assert.ok(Math.abs(stats.spyReturnPct - 4) < 1e-9);
  assert.ok(Math.abs(stats.outperformancePct - 16) < 1e-9);
  assert.ok(Math.abs(stats.maxDrawdownPct - 10) < 1e-9);
  assert.equal(stats.since, snap(0, 0, 1).t);
  const empty = benchmarkStats([], []);
  assert.equal(empty.points.length, 0);
  assert.equal(empty.totalReturnPct, 0);
});

test("maybeRecordSnapshot needs SPY + every held quote, and respects the interval", () => {
  const start = createInitialState();
  const now = Date.now() + 1000;
  const quotes = [q("SPY", 500), q("VTI", 250), q("VXUS", 60), q("BND", 72)];
  assert.equal(maybeRecordSnapshot(start, [q("VTI", 250)], now), start, "no SPY quote → skip");
  assert.equal(maybeRecordSnapshot(start, [q("SPY", 500), q("VTI", 250)], now), start, "missing held quote → skip");

  const first = maybeRecordSnapshot(start, quotes, now);
  assert.equal(first.snapshots.length, 1);
  assert.equal(first.snapshots[0].spy, 500);
  assert.equal(first.snapshots[0].value, Math.round((start.cash + 42 * 250 + 55 * 60 + 40 * 72) * 100) / 100);
  assert.ok(AppStateSchema.safeParse(first).success);

  assert.equal(maybeRecordSnapshot(first, quotes, now + 60_000), first, "within the interval → skip");
  assert.equal(maybeRecordSnapshot(first, quotes, now + SNAPSHOT_INTERVAL_MS).snapshots.length, 2);

  // A deposit forces a snapshot and records the flow.
  const anchored = { ...first, snapshots: [{ ...first.snapshots[0], t: start.createdAt }] };
  const deposited = deposit(anchored, 500);
  const later = new Date(Date.parse(start.createdAt) + 1000).toISOString();
  const funded = {
    ...deposited,
    transactions: deposited.transactions.map((tx, i, all) => (i === all.length - 1 ? { ...tx, createdAt: later } : tx)),
  };
  const after = maybeRecordSnapshot(funded, quotes, Date.parse(start.createdAt) + 2000);
  assert.equal(after.snapshots.length, 2);
  assert.equal(after.snapshots[1].flow, 500);
});

test("capSnapshots keeps the anchor and latest points, carrying flows", () => {
  const list = Array.from({ length: 12 }, (_, i) => snap(i, 1000 + i, 500, i === 1 ? 50 : 0));
  const capped = capSnapshots(list, 8);
  assert.ok(capped.length <= 8);
  assert.equal(capped[0].t, list[0].t);
  assert.equal(capped[capped.length - 1].t, list[11].t);
  const totalFlow = capped.reduce((sum, p) => sum + p.flow, 0);
  assert.equal(totalFlow, 50);
});

test("processMarketTick fills orders, then snapshots in one step", () => {
  const start = placeOrder(createInitialState(), { symbol: "AAPL", side: "buy", type: "limit", shares: 2, triggerPrice: 300 });
  const quotes = [q("SPY", 500), q("VTI", 250), q("VXUS", 60), q("BND", 72), q("AAPL", 210)];
  const result = processMarketTick(start, quotes, Date.now());
  assert.equal(result.changed, true);
  assert.equal(result.fills.length, 1);
  assert.equal(result.state.snapshots.length, 1);
  assert.ok(result.state.holdings.some((h) => h.symbol === "AAPL"));
  const idle = processMarketTick(result.state, quotes, Date.now());
  assert.equal(idle.changed, false);
});
