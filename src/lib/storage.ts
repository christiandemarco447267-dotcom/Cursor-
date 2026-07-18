"use client";

import { createDemoState } from "@/lib/demo-data";
import type { AppState } from "@/lib/types";

const STORAGE_KEY = "ainvestpro.state.v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadState(): AppState {
  if (!isBrowser()) return createDemoState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const demo = createDemoState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
      return demo;
    }
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.holdings)) {
      const demo = createDemoState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
      return demo;
    }
    return parsed;
  } catch {
    const demo = createDemoState();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
    } catch {
      // ignore quota / private mode write failures
    }
    return demo;
  }
}

export function saveState(state: AppState): void {
  if (!isBrowser()) return;
  const next = { ...state, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function resetState(): AppState {
  const demo = createDemoState();
  saveState(demo);
  return demo;
}
