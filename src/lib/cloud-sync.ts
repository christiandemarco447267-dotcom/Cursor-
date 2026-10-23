// Framework-free pieces of the Firestore sync (unit-tested; no Firebase imports).
import { migrateUnknown } from "./storage";
import type { AppState } from "./types";

/** Firestore location of each user's paper account: users/{uid}/state/current. */
export const CLOUD_STATE_COLLECTION = "state";
export const CLOUD_STATE_DOC = "current";
export function cloudStatePath(uid: string): [string, string, string, string] {
  return ["users", uid, CLOUD_STATE_COLLECTION, CLOUD_STATE_DOC];
}

export const AUTOSAVE_DEBOUNCE_MS = 800;

export type CloudPayload = {
  schemaVersion: number;
  updatedAt: string;
  /** The whole paper account: cash, holdings, ledger, theses, profile, and any future fields. */
  state: AppState;
};

/** Strip `undefined` (Firestore rejects it) and any non-JSON values. */
export function toCloudPayload(state: AppState): CloudPayload {
  const plain = JSON.parse(JSON.stringify(state)) as AppState;
  return { schemaVersion: state.version, updatedAt: state.updatedAt, state: plain };
}

/** Read a Firestore document back into a validated (and migrated) AppState, or null if unusable. */
export function fromCloudPayload(data: unknown): AppState | null {
  if (!data || typeof data !== "object" || !("state" in data)) return null;
  return migrateUnknown((data as { state: unknown }).state);
}

/** Should a remote snapshot replace what's in memory? Only when it's strictly newer. */
export function isRemoteNewer(remote: AppState, local: AppState | null): boolean {
  if (!local) return true;
  return new Date(remote.updatedAt).getTime() > new Date(local.updatedAt).getTime();
}

type Timer = ReturnType<typeof setTimeout>;

export type DebouncedSaver<T> = {
  schedule: (value: T) => void;
  flush: () => Promise<void>;
  cancel: () => void;
  pending: () => boolean;
};

/**
 * Coalesces rapid changes into one write `delayMs` after the last change.
 * Writes never overlap: a change made during a write is saved right after it.
 */
export function createDebouncedSaver<T>(
  save: (value: T) => Promise<void>,
  delayMs = AUTOSAVE_DEBOUNCE_MS,
  hooks: { onStart?: () => void; onSuccess?: () => void; onError?: (error: unknown) => void } = {},
  timers: { set: (fn: () => void, ms: number) => Timer; clear: (t: Timer) => void } = {
    set: (fn, ms) => setTimeout(fn, ms),
    clear: (t) => clearTimeout(t),
  },
): DebouncedSaver<T> {
  let timer: Timer | null = null;
  let queued: { value: T } | null = null;
  let inflight: Promise<void> | null = null;

  const run = async (): Promise<void> => {
    if (timer) {
      timers.clear(timer);
      timer = null;
    }
    if (inflight) {
      await inflight;
      if (queued) return run();
      return;
    }
    if (!queued) return;
    const { value } = queued;
    queued = null;
    hooks.onStart?.();
    // Clear `inflight` before the hooks run so `pending()` is accurate inside them.
    inflight = save(value).then(
      () => {
        inflight = null;
        hooks.onSuccess?.();
      },
      (error: unknown) => {
        inflight = null;
        hooks.onError?.(error);
      },
    );
    await inflight;
    if (queued && !timer) return run();
  };

  return {
    schedule(value) {
      queued = { value };
      if (timer) timers.clear(timer);
      timer = timers.set(() => {
        timer = null;
        void run();
      }, delayMs);
    },
    flush: run,
    cancel() {
      if (timer) timers.clear(timer);
      timer = null;
      queued = null;
    },
    pending: () => Boolean(queued || inflight),
  };
}
