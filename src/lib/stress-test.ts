// Thesis stress test: "What would prove this wrong?" plus an optional exit trigger
// that can create a price alert through the existing alert system (pure; unit-tested).
import { addAlert, removeAlert } from "./alerts";
import { commit, nowIso } from "./storage";
import type { AppState, StressTest } from "./types";
import { LIMITS } from "./validation";

export type StressTestInput = {
  disproof: string;
  exitPrice?: number;
  exitDirection?: "above" | "below";
  exitCondition?: string;
  /** Create (or replace) a price alert at the exit price. */
  createAlert?: boolean;
};

function dropLinkedAlert(state: AppState, alertId: string | undefined): AppState {
  if (!alertId) return state;
  const alert = state.alerts.find((a) => a.id === alertId);
  // Keep triggered alerts as history; only remove one still waiting.
  return alert && alert.status === "active" ? removeAlert(state, alertId) : state;
}

export function setStressTest(state: AppState, thesisId: string, input: StressTestInput): AppState {
  const thesis = state.theses.find((t) => t.id === thesisId);
  if (!thesis) throw new Error("Thesis not found.");
  const disproof = input.disproof.trim();
  if (!disproof) throw new Error("Write down what would prove this thesis wrong.");
  if (disproof.length > LIMITS.risksMax) throw new Error("That's a bit long — keep it under 2,000 characters.");
  const exitPrice = input.exitPrice;
  if (exitPrice !== undefined && (!Number.isFinite(exitPrice) || exitPrice <= 0 || exitPrice > LIMITS.maxPrice)) {
    throw new Error("Enter a valid exit price, or leave it blank.");
  }
  if (input.createAlert && exitPrice === undefined) throw new Error("Add an exit price to create an alert.");
  const direction = input.exitDirection ?? "below";

  let next = dropLinkedAlert(state, thesis.stressTest?.alertId);
  let alertId: string | undefined;
  if (input.createAlert && exitPrice !== undefined) {
    const before = new Set(next.alerts.map((a) => a.id));
    next = addAlert(next, { symbol: thesis.symbol, direction, price: exitPrice });
    alertId = next.alerts.find((a) => !before.has(a.id))?.id;
  }
  const stressTest: StressTest = {
    disproof,
    exitDirection: direction,
    exitCondition: (input.exitCondition ?? "").trim().slice(0, 300),
    createdAt: nowIso(),
    ...(exitPrice !== undefined ? { exitPrice: Math.round(exitPrice * 100) / 100 } : {}),
    ...(alertId ? { alertId } : {}),
  };
  const theses = next.theses.map((t) => (t.id === thesisId ? { ...t, stressTest, updatedAt: nowIso() } : t));
  return commit({ ...next, theses });
}

export function clearStressTest(state: AppState, thesisId: string): AppState {
  const thesis = state.theses.find((t) => t.id === thesisId);
  if (!thesis?.stressTest) return state;
  const next = dropLinkedAlert(state, thesis.stressTest.alertId);
  const theses = next.theses.map((t) => (t.id === thesisId ? { ...t, stressTest: undefined, updatedAt: nowIso() } : t));
  return commit({ ...next, theses });
}
