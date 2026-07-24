import assert from "node:assert/strict";
import { test } from "node:test";
import { buildInsights } from "./insights";
import { summarizePortfolio } from "./portfolio";
import { createInitialState } from "./storage";

test("buildInsights flags unlinked holdings in thesis coverage", () => {
  const state = createInitialState();
  const summary = summarizePortfolio(state, []);
  const insights = buildInsights(state, summary, "2026-01-01");
  const coverage = insights.find((i) => i.id === "thesis-coverage");
  assert.ok(coverage);
  assert.equal(coverage?.tone, "watch");
  assert.match(coverage?.body ?? "", /lack a linked thesis/);
});

test("buildInsights surfaces a behavioral cue after a FOMO check-in", () => {
  const base = createInitialState();
  const state = {
    ...base,
    checkIns: [{ id: crypto.randomUUID(), mood: "fomo" as const, note: "", createdAt: new Date().toISOString() }],
  };
  const summary = summarizePortfolio(state, []);
  const insights = buildInsights(state, summary);
  assert.ok(insights.some((i) => i.id === "behavior"));
});
