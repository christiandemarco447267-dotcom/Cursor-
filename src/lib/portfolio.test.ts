import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDemoState } from "@/lib/demo-data";
import {
  applyQuotePrices,
  primaryGoalProgress,
  summarizePortfolio,
} from "@/lib/portfolio";
import { computeStreakStats, upsertTodayStreak } from "@/lib/streaks";
import { scoreInvestorType } from "@/lib/investor-type";

describe("summarizePortfolio", () => {
  it("computes market value and gain for demo holdings", () => {
    const summary = summarizePortfolio(createDemoState().holdings);
    assert.ok(summary.marketValue > 20000);
    assert.ok(summary.gain > 0);
    assert.ok(summary.gainPct > 0);
    assert.ok(summary.allocation.length >= 2);
  });

  it("applies quote overrides safely", () => {
    const holdings = createDemoState().holdings;
    const next = applyQuotePrices(holdings, { AAPL: 250, BAD: -1, MSFT: 0 });
    const aapl = next.find((h) => h.symbol === "AAPL");
    const msft = next.find((h) => h.symbol === "MSFT");
    assert.equal(aapl?.lastPrice, 250);
    assert.equal(msft?.lastPrice, holdings.find((h) => h.symbol === "MSFT")?.lastPrice);
  });
});

describe("primaryGoalProgress", () => {
  it("caps progress at 100%", () => {
    const state = createDemoState();
    const { progress } = primaryGoalProgress(state.goals, 100000);
    assert.equal(progress, 1);
  });
});

describe("streaks", () => {
  it("tracks maintained habits for today", () => {
    const streaks = upsertTodayStreak([], {
      checkIn: true,
      portfolioReview: true,
    });
    const stats = computeStreakStats(streaks);
    assert.equal(stats.maintainedToday, 2);
    assert.equal(stats.totalDaily, 4);
  });
});

describe("investor type", () => {
  it("returns unspecified for incomplete quizzes", () => {
    assert.equal(scoreInvestorType([0, 1]), "unspecified");
  });

  it("maps answers to a type", () => {
    const type = scoreInvestorType([0, 0, 0, 0]);
    assert.equal(type, "builder");
  });
});
