// "Delete my data": wipes everything Sentia keeps on this device, and (when signed in)
// the cloud copy and the account itself. App stores require this:
// - Apple App Review Guideline 5.1.1(v): apps that support account creation must let users
//   delete their account from within the app.
// - Google Play: an in-app path plus a public web URL (/delete-account).
//
// This file holds the pure, testable part (which keys belong to Sentia and how to wipe them).
// The Firebase part lives in cloud-store.ts (deleteCloudAccount).

import { cloudStatePath } from "./cloud-sync";
import { LEGACY_STORAGE_KEYS } from "./storage";

/** Every key Sentia (and its earlier names) writes to localStorage / sessionStorage starts with one of these. */
export const SENTIA_KEY_PREFIXES = ["sentia.", "trellis.", "ainvestpro."] as const;

/** Exact keys outside those prefixes that still belong to Sentia (kept for completeness). */
export const SENTIA_EXTRA_KEYS: readonly string[] = [...LEGACY_STORAGE_KEYS];

/** Cache Storage names created by the service worker (public/sw.js). */
export const SENTIA_CACHE_PREFIX = "sentia-";

export function isSentiaKey(key: string | null | undefined): boolean {
  if (!key) return false;
  return SENTIA_KEY_PREFIXES.some((p) => key.startsWith(p)) || SENTIA_EXTRA_KEYS.includes(key);
}

/** Minimal Storage surface (window.localStorage, sessionStorage, or a test double). */
export type KeyValueStorage = {
  readonly length: number;
  key(index: number): string | null;
  removeItem(key: string): void;
};

/**
 * Remove every Sentia key from a storage area. Other sites' / libraries' keys are left alone,
 * except Firebase's own auth persistence keys when `includeFirebase` is set (used after the
 * account is deleted or signed out, so no session survives on the device).
 * Returns the keys removed.
 */
export function wipeStorage(storage: KeyValueStorage | null | undefined, opts: { includeFirebase?: boolean } = {}): string[] {
  if (!storage) return [];
  const doomed: string[] = [];
  try {
    for (let i = 0; i < storage.length; i += 1) {
      const key: string | null = storage.key(i);
      if (key === null) continue;
      if (isSentiaKey(key) || (opts.includeFirebase && key.startsWith("firebase:"))) doomed.push(key);
    }
  } catch {
    return [];
  }
  const removed: string[] = [];
  for (const key of doomed) {
    try {
      storage.removeItem(key);
      removed.push(key);
    } catch {
      // Keep going: delete as much as possible.
    }
  }
  return removed;
}

export type LocalWipeResult = { localKeys: string[]; sessionKeys: string[]; caches: string[] };

/** Wipe localStorage, sessionStorage and the offline caches on this device. Safe to call anywhere. */
export async function wipeLocalData(env: {
  local?: KeyValueStorage | null;
  session?: KeyValueStorage | null;
  caches?: Pick<CacheStorage, "keys" | "delete"> | null;
} = defaultEnv()): Promise<LocalWipeResult> {
  const localKeys = wipeStorage(env.local, { includeFirebase: true });
  const sessionKeys = wipeStorage(env.session, { includeFirebase: true });
  const caches: string[] = [];
  if (env.caches) {
    try {
      for (const name of await env.caches.keys()) {
        if (name.startsWith(SENTIA_CACHE_PREFIX) && (await env.caches.delete(name))) caches.push(name);
      }
    } catch {
      // Cache Storage unavailable (private mode, native WebView without SW): nothing to clear.
    }
  }
  return { localKeys, sessionKeys, caches };
}

function defaultEnv() {
  if (typeof window === "undefined") return {};
  const safe = <T,>(get: () => T): T | null => {
    try {
      return get();
    } catch {
      return null;
    }
  };
  return {
    local: safe(() => window.localStorage),
    session: safe(() => window.sessionStorage),
    caches: safe(() => ("caches" in window ? window.caches : null)),
  };
}

/** The phrase the user types to confirm deletion (prevents accidental taps). */
export const DELETE_CONFIRM_WORD = "DELETE";

export function deleteConfirmationMatches(input: string): boolean {
  return input.trim().toUpperCase() === DELETE_CONFIRM_WORD;
}

/** The Firestore documents that make up a user's cloud data (see firestore.rules). */
export function cloudDocumentsFor(uid: string, leagueCodes: readonly string[]): string[][] {
  if (!uid) return [];
  return [[...cloudStatePath(uid)], ...leagueCodes.map((code) => ["leagues", code, "members", uid])];
}
