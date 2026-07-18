import type { AppState } from "@/lib/types";

function isoNow(): string {
  return new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

export function createInitialState(): AppState {
  const now = isoNow();
  return {
    version: 1,
    cash: 25_000,
    holdings: [
      {
        id: newId(),
        symbol: "VTI",
        name: "Vanguard Total Stock Market ETF",
        shares: 42,
        avgCost: 245.5,
        createdAt: now,
      },
      {
        id: newId(),
        symbol: "VXUS",
        name: "Vanguard Total International Stock ETF",
        shares: 55,
        avgCost: 58.2,
        createdAt: now,
      },
      {
        id: newId(),
        symbol: "BND",
        name: "Vanguard Total Bond Market ETF",
        shares: 40,
        avgCost: 72.1,
        createdAt: now,
      },
    ],
    goals: [],
    theses: [],
    checkIns: [],
    lessons: [],
    gamification: {
      xp: 0,
      level: 1,
      streak: 0,
      lastActiveDate: null,
      health: "C",
    },
    investor: {
      type: "unspecified",
      answeredAt: null,
    },
    createdAt: now,
    updatedAt: now,
  };
}
