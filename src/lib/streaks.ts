import { todayKey } from "@/lib/format";
import type { DailyStreak } from "@/lib/types";

export type StreakStats = {
  currentStreak: number;
  today: DailyStreak;
  maintainedToday: number;
  totalDaily: number;
  health: "A" | "B" | "C" | "D";
};

const EMPTY_TODAY = (date: string): DailyStreak => ({
  date,
  checkIn: false,
  thesisOrLearn: false,
  goalReview: false,
  portfolioReview: false,
});

export function getTodayStreak(
  streaks: DailyStreak[],
  date = todayKey(),
): DailyStreak {
  return streaks.find((s) => s.date === date) ?? EMPTY_TODAY(date);
}

function countMaintained(day: DailyStreak): number {
  return [
    day.checkIn,
    day.thesisOrLearn,
    day.goalReview,
    day.portfolioReview,
  ].filter(Boolean).length;
}

export function computeStreakStats(
  streaks: DailyStreak[],
  date = todayKey(),
): StreakStats {
  const today = getTodayStreak(streaks, date);
  const maintainedToday = countMaintained(today);
  const totalDaily = 4;

  let currentStreak = 0;
  const sorted = [...streaks].sort((a, b) => b.date.localeCompare(a.date));
  const cursor = new Date(`${date}T12:00:00.000Z`);

  for (let i = 0; i < 60; i += 1) {
    const key = cursor.toISOString().slice(0, 10);
    const day = sorted.find((s) => s.date === key);
    const score = day ? countMaintained(day) : 0;
    if (score >= 2) {
      currentStreak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
      continue;
    }
    if (key === date) {
      cursor.setUTCDate(cursor.getUTCDate() - 1);
      continue;
    }
    break;
  }

  const health =
    maintainedToday >= 4
      ? "A"
      : maintainedToday >= 3
        ? "B"
        : maintainedToday >= 1
          ? "C"
          : "D";

  return { currentStreak, today, maintainedToday, totalDaily, health };
}

export function upsertTodayStreak(
  streaks: DailyStreak[],
  patch: Partial<Omit<DailyStreak, "date">>,
  date = todayKey(),
): DailyStreak[] {
  const existing = getTodayStreak(streaks, date);
  const next = { ...existing, ...patch, date };
  const others = streaks.filter((s) => s.date !== date);
  return [...others, next].sort((a, b) => a.date.localeCompare(b.date));
}
