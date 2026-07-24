import type { AppState, Gamification, HEALTH_GRADES } from "./types";

export const XP_PER_LEVEL = 100;

export const XP_REWARDS = {
  buy: 20,
  sell: 10,
  deposit: 5,
  addGoal: 30,
  contributeGoal: 5,
  addThesis: 40,
  completeLesson: 35,
  checkIn: 15,
  completeQuiz: 50,
} as const;

export function levelFromXp(xp: number): number {
  return Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1;
}

export function xpProgress(xp: number): { intoLevel: number; needed: number } {
  return { intoLevel: Math.max(0, xp) % XP_PER_LEVEL, needed: XP_PER_LEVEL };
}

export function applyXp(g: Gamification, amount: number): Gamification {
  const xp = Math.max(0, g.xp + amount);
  return { ...g, xp, level: levelFromXp(xp) };
}

/** Advance the engagement streak at most once per local day. */
export function touchStreak(g: Gamification, today: string): Gamification {
  if (g.lastActiveDate === today) return g;
  const continued = g.lastActiveDate === previousDayKey(today);
  const streak = continued ? g.streak + 1 : 1;
  const longestStreak = Math.max(g.longestStreak, streak);
  return { ...g, streak, longestStreak, lastActiveDate: today };
}

export function previousDayKey(dayKey: string): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export type ProcessSignals = {
  holdingsCount: number;
  diversified: boolean;
  thesisCoverage: number; // 0..1 of holdings linked to a thesis
  hasCashBuffer: boolean;
  hasGoals: boolean;
  reflectedRecently: boolean;
  score: number; // 0..6
};

/**
 * Signals that describe portfolio "process quality". The health grade and the
 * Insights screen both read from this single source so advice never contradicts
 * the grade the user is shown.
 */
export function processSignals(state: AppState, today: string): ProcessSignals {
  const holdingsCount = state.holdings.length;
  const linked = state.holdings.filter((h) => h.thesisId).length;
  const thesisCoverage = holdingsCount === 0 ? 0 : linked / holdingsCount;
  const diversified = holdingsCount >= 4;
  const hasCashBuffer = state.cash > 0;
  const hasGoals = state.goals.length > 0;
  const reflectedRecently = state.checkIns.some((c) => withinDays(c.createdAt, today, 7));

  let score = 0;
  if (holdingsCount >= 4) score += 2;
  else if (holdingsCount >= 2) score += 1;
  if (thesisCoverage >= 0.5) score += 2;
  else if (thesisCoverage > 0) score += 1;
  if (hasCashBuffer) score += 1;
  if (hasGoals) score += 1;

  return { holdingsCount, diversified, thesisCoverage, hasCashBuffer, hasGoals, reflectedRecently, score };
}

export function computeHealth(state: AppState, today: string): (typeof HEALTH_GRADES)[number] {
  const { score } = processSignals(state, today);
  if (score >= 5) return "A";
  if (score >= 3) return "B";
  if (score >= 1) return "C";
  return "D";
}

function withinDays(iso: string, today: string, days: number): boolean {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return false;
  const [y, m, d] = today.split("-").map(Number);
  const todayStart = new Date(y, m - 1, d).getTime();
  const thenStart = new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime();
  const diff = Math.round((todayStart - thenStart) / 86_400_000);
  return diff >= 0 && diff < days;
}
