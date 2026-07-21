"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { createDemoState } from "@/lib/demo-data";
import { loadState, saveState } from "@/lib/storage";
import type { AppState } from "@/lib/types";

/** Stable server snapshot — React requires getServerSnapshot to be cached. */
const SERVER_SNAPSHOT = createDemoState(
  new Date("2026-07-18T12:00:00.000Z"),
);

let memoryState: AppState | null = null;
let hasHydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function getSnapshot(): AppState {
  // Until hydration finishes, return the same reference as the server.
  if (!hasHydrated) {
    return SERVER_SNAPSHOT;
  }
  if (!memoryState) {
    memoryState = loadState();
  }
  return memoryState;
}

function getServerSnapshot(): AppState {
  return SERVER_SNAPSHOT;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppState() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    memoryState = loadState();
    hasHydrated = true;
    emit();
  }, []);

  const update = useCallback((updater: (prev: AppState) => AppState) => {
    const prev = hasHydrated ? getSnapshot() : loadState();
    hasHydrated = true;
    memoryState = { ...updater(prev), updatedAt: new Date().toISOString() };
    saveState(memoryState);
    emit();
  }, []);

  return { state, update, hydrated: hasHydrated };
}
