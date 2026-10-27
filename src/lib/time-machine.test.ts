import assert from "node:assert/strict";
import { test } from "node:test";
import { createInitialState } from "./storage";
import {
  closeOn,
  endReplay,
  equityCurve,
  getScenario,
  listScenarios,
  replayBook,
  replayChartPoints,
  replayTrade,
  reportCard,
  startReplay,
  stepReplay,
  type ScenarioData,
} from "./time-machine";
import { AppStateSchema, type ReplaySession } from "./types";

const tiny: ScenarioData = {
  dates: ["2020-01-01", "2020-01-02", "2020-01-03", "2020-01-06"],
  prices: { SPY: [100, 80, 70, 90], AAA: [10, 5, 4, 12] },
};
const session = (trades: ReplaySession["trades"], dayIndex = 3): ReplaySession => ({
  id: "00000000-0000-4000-8000-000000000001",
  scenarioId: "x",
  startCash: 10_000,
  dayIndex,
  trades,
  startedAt: new Date().toISOString(),
});

test("bundled scenarios load with real SPY data and a consistent calendar", () => {
  const all = listScenarios();
  assert.deepEqual(all.map((s) => s.id), ["covid-2020", "gfc-2008", "meme-2021"]);
  for (const s of all) {
    assert.ok(s.dates.length > 60, `${s.id} has ${s.dates.length} days`);
    assert.ok(s.prices.SPY, `${s.id} has SPY`);
    for (const [sym, series] of Object.entries(s.prices)) {
      assert.equal(series.length, s.dates.length, `${s.id}/${sym} aligned`);
      assert.ok(series.every((v) => v > 0), `${s.id}/${sym} positive`);
    }
    assert.deepEqual([...s.dates].sort(), s.dates);
  }
  assert.ok(getScenario("meme-2021")?.prices.GME, "GME bundled for 2021");
  assert.equal(getScenario("gfc-2008")?.prices.TSLA, undefined, "no invented pre-IPO TSLA");
  // COVID crash: SPY fell >25% peak-to-trough inside the window.
  const covid = getScenario("covid-2020")!;
  assert.ok(Math.min(...covid.prices.SPY) < Math.max(...covid.prices.SPY) * 0.75);
});

test("trades fill at the day's close; book and equity curve follow", () => {
  const s = session([
    { day: 0, side: "buy", symbol: "AAA", shares: 500 }, // $5,000
    { day: 2, side: "sell", symbol: "AAA", shares: 250 }, // at $4
  ]);
  const book = replayBook(s, tiny);
  assert.equal(book.cash, 6000);
  assert.equal(book.positions[0].shares, 250);
  assert.equal(book.realized, -1500);
  const curve = equityCurve(s, tiny);
  assert.deepEqual(curve.map((c) => c.value), [10000, 7500, 7000, 9000]);
  const points = replayChartPoints(curve, 10_000);
  assert.equal(points[0].portfolio, 100);
  assert.equal(points[3].spy, 90);
  assert.equal(closeOn(tiny, "aaa", 3), 12);
});

test("report card: return vs SPY, drawdown and panic-selling feedback", () => {
  const card = reportCard(session([{ day: 0, side: "buy", symbol: "AAA", shares: 500 }, { day: 2, side: "sell", symbol: "AAA", shares: 250 }]), tiny);
  assert.equal(Math.round(card.returnPct), -10);
  assert.equal(Math.round(card.spyReturnPct), -10);
  assert.equal(card.beatSpy, false);
  assert.equal(Math.round(card.maxDrawdownPct), 30);
  assert.ok(card.feedback.some((f) => f.title === "Sold into the drawdown"));
  assert.ok(card.processScore < 100);
  const holder = reportCard(session([{ day: 1, side: "buy", symbol: "SPY", shares: 50 }, { day: 1, side: "buy", symbol: "AAA", shares: 400 }]), tiny);
  assert.ok(holder.beatSpy);
  assert.ok(holder.feedback.some((f) => f.title === "Bought when others were fearful"));
});

test("replay session lives apart from the main account and finishes at the end", () => {
  const main = createInitialState();
  let s = startReplay(main, "covid-2020");
  assert.ok(s.replay);
  assert.equal(s.cash, main.cash);
  assert.equal(s.transactions.length, main.transactions.length);
  s = replayTrade(s, { side: "buy", symbol: "SPY", shares: 10 });
  assert.throws(() => replayTrade(s, { side: "buy", symbol: "SPY", shares: 1_000 }), /Not enough cash/);
  assert.throws(() => replayTrade(s, { side: "sell", symbol: "AAPL", shares: 1 }), /only hold/);
  assert.throws(() => replayTrade(s, { side: "buy", symbol: "ZZZZ", shares: 1 }), /isn't available/);
  let r = stepReplay(s, 5);
  assert.equal(r.state.replay?.dayIndex, 5);
  assert.equal(r.finished, null);
  r = stepReplay(r.state, "end");
  assert.ok(r.finished);
  assert.ok(r.state.replay?.finishedAt);
  assert.equal(r.state.replayHistory.length, 1);
  assert.throws(() => replayTrade(r.state, { side: "buy", symbol: "SPY", shares: 1 }), /finished/);
  assert.ok(AppStateSchema.safeParse(r.state).success);
  // Main account untouched throughout.
  assert.equal(r.state.cash, main.cash);
  assert.deepEqual(r.state.holdings, main.holdings);
  assert.equal(endReplay(r.state).replay, null);
});
