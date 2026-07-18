import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { summarizePortfolio, allocationSlices } from "@/lib/portfolio";
import { createInitialState } from "@/lib/initial-state";
import { levelFromXp, computeHealth } from "@/lib/gamification";
import type { Quote } from "@/lib/types";

describe("portfolio summary", () => {
  it("values holdings with quote prices", () => {
    const state = createInitialState();
    state.holdings = [
      {
        id: "00000000-0000-4000-8000-000000000001",
        symbol: "VTI",
        name: "VTI",
        shares: 10,
        avgCost: 100,
        createdAt: new Date().toISOString(),
      },
    ];
    state.cash = 1000;
    const quotes: Quote[] = [
      {
        symbol: "VTI",
        price: 110,
        previousClose: 108,
        changePercent: 1.85,
        source: "demo",
      },
    ];
    const summary = summarizePortfolio(state, quotes);
    assert.equal(summary.investments, 1100);
    assert.equal(summary.total, 2100);
    assert.equal(summary.gain, 100);
  });

  it("builds allocation slices including cash", () => {
    const state = createInitialState();
    state.holdings = [];
    state.cash = 500;
    const summary = summarizePortfolio(state, []);
    const slices = allocationSlices(summary);
    assert.equal(slices.length, 1);
    assert.equal(slices[0]?.label, "Cash");
  });
});

describe("gamification", () => {
  it("levels from xp", () => {
    assert.equal(levelFromXp(0), 1);
    assert.equal(levelFromXp(99), 1);
    assert.equal(levelFromXp(100), 2);
  });

  it("scores health from process signals", () => {
    const state = createInitialState();
    state.goals = [];
    state.theses = [];
    state.holdings = [];
    state.cash = 0;
    assert.equal(computeHealth(state), "D");
  });
});
