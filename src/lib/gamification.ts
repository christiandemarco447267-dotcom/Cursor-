import type { AppState, Gamification } from "@/lib/types";
import { todayKey } from "@/lib/format";

const XP_PER_LEVEL = 100;

export function levelFromXp(xp: number): number {
  return Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
}

export function xpProgress(xp: number): { intoLevel: number; needed: number } {
  const intoLevel = xp % XP_PER_LEVEL;
  return { intoLevel, needed: XP_PER_LEVEL };
}

export function applyXp(g: Gamification, amount: number): Gamification {
  const xp = Math.min(10_000_000, g.xp + Math.max(0, amount));
  return { ...g, xp, level: levelFromXp(xp) };
}

export function touchStreak(g: Gamification, now = new Date()): Gamification {
  const today = todayKey(now);
  if (g.lastActiveDate === today) return g;

  const yesterday = todayKey(new Date(now.getTime() - 86_400_000));
  const streak =
    g.lastActiveDate === yesterday ? g.streak + 1 : g.lastActiveDate ? 1 : 1;

  return {
    ...g,
    streak,
    lastActiveDate: today,
  };
}

/** Portfolio health grade from diversification + cash buffer + thesis coverage. */
export function computeHealth(state: AppState): Gamification["health"] {
  const holdingCount = state.holdings.length;
  const thesisCoverage =
    holdingCount === 0
      ? 0
      : state.holdings.filter((h) => h.thesisId).length / holdingCount;
  const cashRatioHint = state.cash > 0 ? 1 : 0;
  const score =
    (holdingCount >= 4 ? 2 : holdingCount >= 2 ? 1 : 0) +
    (thesisCoverage >= 0.5 ? 2 : thesisCoverage > 0 ? 1 : 0) +
    cashRatioHint +
    (state.goals.length > 0 ? 1 : 0);

  if (score >= 5) return "A";
  if (score >= 3) return "B";
  if (score >= 1) return "C";
  return "D";
}

export const XP_REWARDS = {
  addHolding: 25,
  addGoal: 30,
  addThesis: 40,
  completeLesson: 35,
  checkIn: 15,
  completeQuiz: 50,
} as const;
