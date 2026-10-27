import assert from "node:assert/strict";
import { test } from "node:test";
import { addAlert } from "./alerts";
import { disciplineScore, gradeFor, milestoneFor, weakestPart } from "./discipline";
import { summarizePortfolio } from "./portfolio";
import { buy, createInitialState } from "./storage";
import { setStressTest } from "./stress-test";
import type { AppState, Quote } from "./types";

const quotes = (s: AppState): Quote[] => s.holdings.map((h) => ({ symbol: h.symbol, price: h.avgCost, previousClose: h.avgCost, changePercent: 0, source: "demo" }));
const score = (s: AppState) => disciplineScore(s, summarizePortfolio(s, quotes(s)));

test("seeded demo account scores well but leaves room for alerts/stops", () => {
  const result = score(createInitialState());
  assert.equal(result.parts.length, 5);
  assert.equal(result.parts.reduce((s, p) => s + p.max, 0), 100);
  const by = Object.fromEntries(result.parts.map((p) => [p.key, p]));
  assert.equal(by.thesis.points, 20);
  assert.equal(by.biases.points, 20);
  assert.equal(by.riskTools.points, 0);
  assert.ok(result.score >= 60 && result.score <= 85, `score ${result.score}`);
  assert.equal(weakestPart(result)?.key, "riskTools");
});

test("alerts and stress-test exits raise the risk-tools part", () => {
  let s = createInitialState();
  const before = score(s).score;
  s = addAlert(s, { symbol: "VTI", direction: "below", price: 200 });
  const vxusThesis = s.theses.find((t) => t.symbol === "VXUS")!;
  s = setStressTest(s, vxusThesis.id, { disproof: "International keeps lagging for 5 years", exitPrice: 45 });
  const after = score(s);
  assert.ok(after.score > before);
  assert.equal(after.parts.find((p) => p.key === "riskTools")?.detail.startsWith("2 of 3"), true);
});

test("an oversized, undocumented position is penalised", () => {
  let s = createInitialState();
  s = buy(s, { symbol: "TSLA", shares: 100, price: 240 }); // ~$24k, no thesis
  const result = score(s);
  const by = Object.fromEntries(result.parts.map((p) => [p.key, p]));
  assert.ok(by.sizing.points < 20);
  assert.ok(by.thesis.points < 20);
  assert.ok(result.score < score(createInitialState()).score);
});

test("an all-cash account gets no diversification credit; score stays in 0–100", () => {
  const s: AppState = { ...createInitialState(), holdings: [] };
  const result = score(s);
  assert.equal(result.parts.find((p) => p.key === "diversification")?.points, 0);
  assert.ok(result.score >= 0 && result.score <= 100);
});

test("grades and milestones", () => {
  assert.equal(gradeFor(92), "Excellent");
  assert.equal(gradeFor(71), "Strong");
  assert.equal(gradeFor(55), "Building");
  assert.equal(gradeFor(10), "Needs work");
  assert.equal(milestoneFor(59), 0);
  assert.equal(milestoneFor(60), 60);
  assert.equal(milestoneFor(89), 75);
  assert.equal(milestoneFor(100), 90);
});
