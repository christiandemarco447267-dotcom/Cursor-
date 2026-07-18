"use client";

import type { AppState } from "@/lib/types";
import { createInitialState, loadState, saveState } from "@/lib/storage";

type Listener = () => void;

let state: AppState | null = null;
const listeners = new Set<Listener>();

function ensureState(): AppState {
  if (!state) {
    state = typeof window === "undefined" ? createInitialState() : loadState();
  }
  return state;
}

function emit() {
  for (const listener of listeners) listener();
}

export function getAppState(): AppState {
  return ensureState();
}

export function getServerAppState(): AppState {
  return createInitialState();
}

export function subscribeAppState(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setAppState(next: AppState | ((prev: AppState) => AppState)): void {
  const prev = ensureState();
  state = typeof next === "function" ? next(prev) : next;
  saveState(state);
  emit();
}

export function replaceAppState(next: AppState): void {
  state = next;
  saveState(state);
  emit();
}
