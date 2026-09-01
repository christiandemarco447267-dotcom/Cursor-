import assert from "node:assert/strict";
import { test } from "node:test";
import { buildInsights } from "./insights";
import { summarizePortfolio } from "./portfolio";
import { createInitialState } from "./storage";

test("buildInsights flags unlinked holdings in thesis coverage", () => {
  const state = createInitialState();
  const summary = summarizePortfolio(state, []);
  const insights = buildInsights(state, summary);
  const coverage = insights.find((i) => i.id === "thesis-coverage");
  assert.ok(coverage);
  assert.equal(coverage?.tone, "watch");
  assert.match(coverage?.body ?? "", /lack a linked thesis/);
});

test("buildInsights includes diversification, concentration, and cash cards", () => {
  const state = createInitialState();
  const summary = summarizePortfolio(state, []);
  const ids = buildInsights(state, summary).map((i) => i.id);
  assert.ok(ids.includes("diversification"));
  assert.ok(ids.includes("concentration"));
  assert.ok(ids.includes("cash"));
});

test("buildInsights prompts to start when there are no holdings", () => {
  const base = createInitialState();
  const state = { ...base, holdings: [] };
  const summary = summarizePortfolio(state, []);
  const insights = buildInsights(state, summary);
  assert.ok(insights.some((i) => i.id === "start"));
});
