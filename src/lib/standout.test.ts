// Ghost line, coach, stress test and share-card data.
import assert from "node:assert/strict";
import { test } from "node:test";
import { estimatePrice, neverSoldIndex, seriesWithGhost, trailingReturnPct } from "./benchmark";
import { detectIntent, ruleBasedAnswer, ruleBasedCoach } from "./coach";
import { summarizePortfolio } from "./portfolio";
import { holdLabel, tradeCardData } from "./share-card";
import { buy, createInitialState, sell } from "./storage";
import { clearStressTest, setStressTest } from "./stress-test";
import { AppStateSchema, type PerfSnapshot, type Quote, type Transaction } from "./types";

const q = (symbol: string, price: number): Quote => ({ symbol, price, previousClose: price, changePercent: 0, source: "demo" });
const T = (h: number) => new Date(Date.parse("2026-10-01T14:00:00Z") + h * 3_600_000).toISOString();

test("estimatePrice interpolates between observations and holds flat outside", () => {
  const obs = [{ t: 0, price: 10 }, { t: 100, price: 20 }];
  assert.equal(estimatePrice(obs, -5), 10);
  assert.equal(estimatePrice(obs, 50), 15);
  assert.equal(estimatePrice(obs, 500), 20);
  assert.equal(estimatePrice([], 1), null);
});

test("'If you never sold' ghost adds back the sold shares' move since the sale", () => {
  const sellTx: Transaction = { id: "00000000-0000-4000-8000-000000000009", type: "sell", symbol: "AAA", shares: 10, price: 100, amount: 1000, realizedGain: 0, cashAfter: 1000, note: "", createdAt: T(1) };
  const snaps: PerfSnapshot[] = [
    { t: T(0), value: 1000, spy: 100, flow: 0 },
    { t: T(1), value: 1000, spy: 100, flow: 0 }, // sold at 100 → all cash
    { t: T(2), value: 1000, spy: 100, flow: 0 },
  ];
  const now = Date.parse(T(2));
  const ghost = neverSoldIndex(snaps, [sellTx], [q("AAA", 150)], null, now)!;
  assert.equal(ghost[0], 100);
  assert.equal(Math.round(ghost[2]), 150); // shares went 100 → 150 after the sale
  assert.equal(neverSoldIndex(snaps, [], [], null, now), null);
  const series = seriesWithGhost(snaps, [sellTx], [q("AAA", 150)], null, now);
  assert.equal(series.length, 3);
  assert.equal(Math.round(series[2].ghost ?? 0), 150);
  assert.equal(series[2].portfolio, 100);
});

test("trailingReturnPct covers the window from the last snapshot before it", () => {
  const day = 86_400_000;
  const now = Date.parse("2026-10-27T12:00:00Z");
  const snaps: PerfSnapshot[] = [
    { t: new Date(now - 40 * day).toISOString(), value: 1000, spy: 1, flow: 0 },
    { t: new Date(now - 10 * day).toISOString(), value: 1100, spy: 1, flow: 0 },
    { t: new Date(now - 1 * day).toISOString(), value: 1210, spy: 1, flow: 0 },
  ];
  assert.ok(Math.abs((trailingReturnPct(snaps, now) ?? 0) - 21) < 1e-9);
  assert.equal(trailingReturnPct(snaps.slice(0, 1), now), null);
});

test("coach: intent routing and answers grounded in the account", async () => {
  assert.equal(detectIntent("Am I too heavy in tech?"), "concentration");
  assert.equal(detectIntent("How much cash do I have?"), "cash");
  assert.equal(detectIntent("What's my biggest loser?"), "loser");
  assert.equal(detectIntent("What should I review this week?"), "review");
  assert.equal(detectIntent("hello"), "help");
  let s = createInitialState();
  s = buy(s, { symbol: "NVDA", shares: 100, price: 120 });
  const summary = summarizePortfolio(s, [q("NVDA", 130), q("VTI", 246), q("VXUS", 59), q("BND", 72)]);
  const ctx = { state: s, summary, now: Date.now() };
  const tech = ruleBasedAnswer("Am I too heavy in tech?", ctx);
  assert.match(tech.text, /Technology is \d+% of your invested money \(NVDA\)/);
  assert.match(ruleBasedAnswer("What's my biggest winner?", ctx).text, /NVDA/);
  assert.match(ruleBasedAnswer("Do all my holdings have a thesis?", ctx).text, /1 of 4 holdings have no thesis: NVDA/);
  assert.match(ruleBasedAnswer("What's my Discipline Score?", ctx).text, /\d+\/100/);
  assert.match((await ruleBasedCoach.answer("cash?", ctx)).text, /in cash/);
});

test("stress test saves on the thesis and can create/remove a linked price alert", () => {
  let s = createInitialState();
  const thesis = s.theses[0];
  assert.throws(() => setStressTest(s, thesis.id, { disproof: "  " }), /prove/);
  assert.throws(() => setStressTest(s, thesis.id, { disproof: "x", createAlert: true }), /exit price/);
  s = setStressTest(s, thesis.id, { disproof: "US earnings shrink two years running", exitPrice: 200, exitDirection: "below", exitCondition: "Recession", createAlert: true });
  const st = s.theses[0].stressTest!;
  assert.equal(st.exitPrice, 200);
  assert.ok(st.alertId);
  const alert = s.alerts.find((a) => a.id === st.alertId)!;
  assert.equal(alert.symbol, thesis.symbol);
  assert.equal(alert.direction, "below");
  // Re-saving replaces (not duplicates) the alert.
  s = setStressTest(s, thesis.id, { disproof: "Updated", exitPrice: 190, createAlert: true });
  assert.equal(s.alerts.length, 1);
  assert.ok(AppStateSchema.safeParse(s).success);
  s = clearStressTest(s, thesis.id);
  assert.equal(s.theses[0].stressTest, undefined);
  assert.equal(s.alerts.length, 0);
});

test("share-card data: result %, hold length, thesis title", () => {
  let s = createInitialState();
  s = sell(s, { symbol: "VTI", shares: 2, price: 270.05 });
  const tx = s.transactions[s.transactions.length - 1];
  const card = tradeCardData(s, tx.id)!;
  assert.equal(card.symbol, "VTI");
  assert.equal(card.thesisTitle, "Own the entire US market");
  assert.equal(card.resultPct.toFixed(1), "10.0");
  assert.equal(card.resultDollars, 49.1);
  assert.equal(tradeCardData(s, s.transactions[0].id), null);
  assert.equal(holdLabel(3 * 3_600_000), "3 hours");
  assert.equal(holdLabel(5 * 86_400_000), "5 days");
  assert.equal(holdLabel(120 * 86_400_000), "4 months");
});
