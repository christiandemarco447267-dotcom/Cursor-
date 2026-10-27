// Regression tests for the QA pass (qa-fixes branch).
import assert from "node:assert/strict";
import { test } from "node:test";
import { addAlert } from "./alerts";
import { detectIntent, ruleBasedAnswer } from "./coach";
import { buildInsights, listSymbols } from "./insights";
import { computeBuy, computeSell, summarizePortfolio } from "./portfolio";
import { holdLabel } from "./share-card";
import { normalizeBasePath, resolveSiteUrl } from "./site";
import { buy, createInitialState, importStateJson, removeThesis, updateThesis } from "./storage";
import { requestSymbols } from "./store";
import { setStressTest } from "./stress-test";
import { getScenario, replayTrade, startReplay } from "./time-machine";
import type { Quote } from "./types";

const q = (symbol: string, price: number): Quote => ({ symbol, price, previousClose: price, changePercent: 0, source: "demo" });
const idGen = () => "00000000-0000-4000-8000-0000000000aa";

// ---- Site URL / base path ------------------------------------------------------

test("site URL is derived from the GitHub repo + Pages base path, not hardcoded", () => {
  assert.equal(
    resolveSiteUrl({ GITHUB_REPOSITORY_OWNER: "christiandemarco447267-dotcom", PAGES_BASE_PATH: "/Cursor-" }),
    "https://christiandemarco447267-dotcom.github.io/Cursor-/",
  );
  assert.equal(resolveSiteUrl({ GITHUB_REPOSITORY: "Some-Owner/Renamed-Repo" }), "https://some-owner.github.io/Renamed-Repo/");
  // Explicit URL (custom domain / configure-pages base_url) wins and is normalized.
  assert.equal(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://sentia.example.com//", PAGES_BASE_PATH: "/Cursor-" }), "https://sentia.example.com/");
  // Nothing set: the live Pages deployment.
  assert.equal(resolveSiteUrl({}), "https://christiandemarco447267-dotcom.github.io/Cursor-/");
  assert.equal(normalizeBasePath("Cursor-/"), "/Cursor-");
  assert.equal(normalizeBasePath(""), "");
});

// ---- Trading -------------------------------------------------------------------

test("a market buy or sell at $0 is rejected (no free shares)", () => {
  const s = createInitialState();
  assert.throws(() => computeBuy(s, { symbol: "NVDA", shares: 1, price: 0 }, "now", idGen), /above \$0/);
  assert.throws(() => computeSell(s, { symbol: "VTI", shares: 1, price: 0 }, "now"), /above \$0/);
});

test("trade errors show formatted currency, not raw decimals", () => {
  const s = createInitialState();
  assert.throws(() => computeBuy(s, { symbol: "NVDA", shares: 100000, price: 120 }, "now", idGen), /costs \$12,000,000\.00 but only \$[\d,]+\.\d\d/);
  assert.throws(() => computeSell(s, { symbol: "VTI", shares: 1000, price: 100 }, "now"), /You only hold 42 VTI, so you can't sell 1,000\./);
});

test("the simulated feed quotes every held symbol, even past the 20-symbol network cap", () => {
  let s = createInitialState();
  const extra = Array.from({ length: 25 }, (_, i) => `ZZ${String.fromCharCode(65 + i)}`);
  for (const sym of extra) s = buy(s, { symbol: sym, shares: 1, price: 1 });
  assert.equal(requestSymbols(s).length, 20);
  const all = requestSymbols(s, Number.POSITIVE_INFINITY);
  for (const sym of extra) assert.ok(all.includes(sym), `${sym} should be quoted`);
});

// ---- Theses ----------------------------------------------------------------------

test("updateThesis edits fields, ignores blank title/rationale, and clamps conviction", () => {
  const s = createInitialState();
  const t = s.theses[0];
  const next = updateThesis(s, t.id, { title: "  New title ", rationale: "", risks: " r ", conviction: 9 });
  const edited = next.theses.find((x) => x.id === t.id)!;
  assert.equal(edited.title, "New title");
  assert.equal(edited.rationale, t.rationale);
  assert.equal(edited.risks, "r");
  assert.equal(edited.conviction, 5);
});

test("deleting a thesis also removes its still-active stress-test alert", () => {
  let s = createInitialState();
  const t = s.theses[0];
  s = setStressTest(s, t.id, { disproof: "x", exitPrice: 100, exitDirection: "below", createAlert: true });
  const alertId = s.theses.find((x) => x.id === t.id)!.stressTest!.alertId!;
  s = addAlert(s, { symbol: "MSFT", direction: "above", price: 999 }); // unrelated alert survives
  const after = removeThesis(s, t.id);
  assert.equal(after.alerts.some((a) => a.id === alertId), false);
  assert.equal(after.alerts.length, 1);
});

// ---- Insights / coach -----------------------------------------------------------

test("thesis coverage lists every unlinked holding (or says how many more) with correct grammar", () => {
  assert.equal(listSymbols(["A", "B", "C", "D", "E", "F"]), "A, B, C, D and 2 more");
  assert.equal(listSymbols(["A"]), "A");
  let s = createInitialState();
  for (const sym of ["AAPL", "MSFT", "NVDA", "AMZN", "SPY"]) s = buy(s, { symbol: sym, shares: 1, price: 10 });
  const body = buildInsights(s, summarizePortfolio(s, [])).find((i) => i.id === "thesis-coverage")!.body;
  assert.match(body, /^5 holdings \(AAPL, MSFT, NVDA, AMZN and 1 more\) lack a linked thesis/);
});

test("Ask Sentia answers return, single-holding and advice questions", () => {
  const s = createInitialState();
  const summary = summarizePortfolio(s, [q("VTI", 250), q("VXUS", 60), q("BND", 72), q("SPY", 500)]);
  assert.equal(detectIntent("What is my total return?"), "benchmark");
  assert.equal(detectIntent("How am I doing?"), "benchmark");
  assert.equal(detectIntent("Should I buy NVDA?"), "advice");
  assert.equal(detectIntent("What should I review this week?"), "review");
  const pos = ruleBasedAnswer("how many shares of VTI do I own", { state: s, summary });
  assert.equal(pos.intent, "position");
  assert.match(pos.text, /You hold 42 VTI/);
  const advice = ruleBasedAnswer("should I sell VTI?", { state: s, summary });
  assert.equal(advice.intent, "advice");
  assert.match(advice.text, /can't tell you what to buy or sell/);
});

test("share card hold label says 'under an hour' for quick round trips", () => {
  assert.equal(holdLabel(10 * 60_000), "under an hour");
  assert.equal(holdLabel(3 * 3_600_000), "3 hours");
});

// ---- Settings import ------------------------------------------------------------

test("importing a non-JSON file gives a friendly error", () => {
  assert.throws(() => importStateJson("not json"), /isn't valid JSON/);
  assert.throws(() => importStateJson('{"hello":1}'), /not a valid Sentia backup/);
});

// ---- Time Machine ---------------------------------------------------------------

test("Time Machine trade errors are formatted", () => {
  assert.ok(getScenario("covid-2020"));
  const s = startReplay(createInitialState(), "covid-2020");
  assert.throws(() => replayTrade(s, { side: "buy", symbol: "SPY", shares: 1_000_000 }), /costs \$[\d,]+\.\d\d and you have \$10,000\.00/);
});
