"use client";

import {
  AppStateSchema,
  CheckInSchema,
  GoalSchema,
  HoldingSchema,
  ThesisSchema,
  type AppState,
  type Holding,
  type Goal,
  type Thesis,
  type CheckIn,
} from "@/lib/types";
import {
  applyXp,
  computeHealth,
  touchStreak,
  XP_REWARDS,
} from "@/lib/gamification";
import { todayKey } from "@/lib/format";
import { createInitialState } from "@/lib/initial-state";

export { createInitialState };

const STORAGE_KEY = "ainvestpro.state.v1";

function isoNow(): string {
  return new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

export function loadState(): AppState {
  if (typeof window === "undefined") return createInitialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as unknown;
    const result = AppStateSchema.safeParse(parsed);
    if (!result.success) {
      console.warn("AInvestPro: invalid stored state, resetting", result.error.flatten());
      return createInitialState();
    }
    return result.data;
  } catch {
    return createInitialState();
  }
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  const result = AppStateSchema.safeParse(state);
  if (!result.success) {
    console.error("AInvestPro: refused to persist invalid state", result.error.flatten());
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
}

function withMeta(state: AppState): AppState {
  const next = {
    ...state,
    updatedAt: isoNow(),
    gamification: {
      ...touchStreak(state.gamification),
      health: computeHealth(state),
    },
  };
  return next;
}

export function addHolding(
  state: AppState,
  input: Omit<Holding, "id" | "createdAt">,
): AppState {
  const holding = HoldingSchema.parse({
    ...input,
    symbol: input.symbol.toUpperCase(),
    id: newId(),
    createdAt: isoNow(),
  });
  let next = withMeta({
    ...state,
    holdings: [...state.holdings, holding],
  });
  next = {
    ...next,
    gamification: applyXp(next.gamification, XP_REWARDS.addHolding),
  };
  return withMeta(next);
}

export function removeHolding(state: AppState, id: string): AppState {
  return withMeta({
    ...state,
    holdings: state.holdings.filter((h) => h.id !== id),
  });
}

export function addGoal(
  state: AppState,
  input: Omit<Goal, "id" | "createdAt">,
): AppState {
  const goal = GoalSchema.parse({
    ...input,
    id: newId(),
    createdAt: isoNow(),
  });
  let next = withMeta({ ...state, goals: [...state.goals, goal] });
  next = {
    ...next,
    gamification: applyXp(next.gamification, XP_REWARDS.addGoal),
  };
  return withMeta(next);
}

export function addThesis(
  state: AppState,
  input: Omit<Thesis, "id" | "createdAt" | "updatedAt">,
): AppState {
  const now = isoNow();
  const thesis = ThesisSchema.parse({
    ...input,
    symbol: input.symbol.toUpperCase(),
    id: newId(),
    createdAt: now,
    updatedAt: now,
  });
  let next = withMeta({ ...state, theses: [...state.theses, thesis] });
  next = {
    ...next,
    gamification: applyXp(next.gamification, XP_REWARDS.addThesis),
  };
  return withMeta(next);
}

export function addCheckIn(
  state: AppState,
  input: Omit<CheckIn, "id" | "createdAt">,
): AppState {
  const today = todayKey();
  const already = state.checkIns.some((c) => c.createdAt.slice(0, 10) === today);
  const checkIn = CheckInSchema.parse({
    ...input,
    id: newId(),
    createdAt: isoNow(),
  });
  let next = withMeta({
    ...state,
    checkIns: [checkIn, ...state.checkIns].slice(0, 365),
  });
  if (!already) {
    next = {
      ...next,
      gamification: applyXp(next.gamification, XP_REWARDS.checkIn),
    };
  }
  return withMeta(next);
}

export function completeLesson(state: AppState, lessonId: string): AppState {
  const existing = state.lessons.find((l) => l.lessonId === lessonId);
  if (existing?.completed) return state;
  const lessons = [
    ...state.lessons.filter((l) => l.lessonId !== lessonId),
    { lessonId, completed: true, completedAt: isoNow() },
  ];
  let next = withMeta({ ...state, lessons });
  next = {
    ...next,
    gamification: applyXp(next.gamification, XP_REWARDS.completeLesson),
  };
  return withMeta(next);
}

export function setInvestorType(
  state: AppState,
  type: AppState["investor"]["type"],
): AppState {
  let next = withMeta({
    ...state,
    investor: { type, answeredAt: isoNow() },
  });
  if (state.investor.type === "unspecified") {
    next = {
      ...next,
      gamification: applyXp(next.gamification, XP_REWARDS.completeQuiz),
    };
  }
  return withMeta(next);
}

export function resetState(): AppState {
  const fresh = createInitialState();
  saveState(fresh);
  return fresh;
}

export function exportStateJson(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function importStateJson(raw: string): AppState {
  const parsed = JSON.parse(raw) as unknown;
  const result = AppStateSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("Import failed validation. File may be corrupt or from an unsupported version.");
  }
  saveState(result.data);
  return result.data;
}
