import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyXp,
  computeHealth,
  levelFromXp,
  previousDayKey,
  processSignals,
  touchStreak,
  xpProgress,
} from "./gamification";
import { createInitialState } from "./storage";
import type { Gamification } from "./types";

const baseGam: Gamification = { xp: 0, level: 1, streak: 0, longestStreak: 0, lastActiveDate: null, health: "C" };

test("levelFromXp and xpProgress", () => {
  assert.equal(levelFromXp(0), 1);
  assert.equal(levelFromXp(99), 1);
  assert.equal(levelFromXp(100), 2);
  assert.deepEqual(xpProgress(150), { intoLevel: 50, needed: 100 });
});

test("applyXp raises level and never goes negative", () => {
  const g = applyXp(baseGam, 250);
  assert.equal(g.xp, 250);
  assert.equal(g.level, 3);
  assert.equal(applyXp(baseGam, -50).xp, 0);
});

test("previousDayKey handles month boundaries", () => {
  assert.equal(previousDayKey("2026-03-01"), "2026-02-28");
  assert.equal(previousDayKey("2026-01-01"), "2025-12-31");
});

test("touchStreak advances once/day, continues consecutively, resets on a gap", () => {
  const day1 = touchStreak(baseGam, "2026-01-01");
  assert.equal(day1.streak, 1);
  // Same day: no change.
  assert.equal(touchStreak(day1, "2026-01-01").streak, 1);
  // Next day: +1.
  const day2 = touchStreak(day1, "2026-01-02");
  assert.equal(day2.streak, 2);
  assert.equal(day2.longestStreak, 2);
  // Gap: reset to 1 but keep longest.
  const afterGap = touchStreak(day2, "2026-01-10");
  assert.equal(afterGap.streak, 1);
  assert.equal(afterGap.longestStreak, 2);
});

test("processSignals and computeHealth agree on a strong portfolio", () => {
  const state = createInitialState();
  const today = "2026-01-01";
  const signals = processSignals(state, today);
  assert.equal(signals.holdingsCount, 3);
  // Seed: 3 holdings (+1), no theses (0), cash (+1), no goals (0) => score 2 => grade C.
  assert.equal(computeHealth(state, today), "C");

  const strong = {
    ...state,
    holdings: state.holdings.map((h) => ({ ...h, thesisId: crypto.randomUUID() })),
    goals: [{ id: crypto.randomUUID(), title: "g", targetAmount: 1, currentAmount: 0, deadline: undefined, createdAt: state.createdAt, updatedAt: state.updatedAt }],
  };
  // 3 holdings(+1) + full thesis coverage(+2) + cash(+1) + goals(+1) = 5 => A
  assert.equal(computeHealth(strong, today), "A");
});
