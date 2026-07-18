"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createDemoState } from "@/lib/demo-data";
import { loadState, saveState } from "@/lib/storage";
import type { AppState } from "@/lib/types";

let memoryState: AppState | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function getSnapshot(): AppState {
  if (!memoryState) {
    memoryState = loadState();
  }
  return memoryState;
}

function getServerSnapshot(): AppState {
  return createDemoState(new Date("2026-07-18T12:00:00.000Z"));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppState() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const update = useCallback((updater: (prev: AppState) => AppState) => {
    const prev = getSnapshot();
    memoryState = { ...updater(prev), updatedAt: new Date().toISOString() };
    saveState(memoryState);
    emit();
  }, []);

  return { state, update, hydrated: true };
}
