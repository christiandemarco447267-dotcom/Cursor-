"use client";

import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { cloudStatePath, fromCloudPayload, toCloudPayload } from "./cloud-sync";
import { firestore } from "./firebase";
import type { AppState } from "./types";

function stateDoc(uid: string) {
  const [a, b, c, d] = cloudStatePath(uid);
  return doc(firestore(), a, b, c, d);
}

/** Load the user's paper account. `exists: false` means a brand-new account. */
export async function loadCloudState(uid: string): Promise<{ exists: boolean; state: AppState | null }> {
  const snap = await getDoc(stateDoc(uid));
  if (!snap.exists()) return { exists: false, state: null };
  return { exists: true, state: fromCloudPayload(snap.data()) };
}

export async function saveCloudState(uid: string, state: AppState): Promise<void> {
  await setDoc(stateDoc(uid), { ...toCloudPayload(state), savedAt: serverTimestamp() });
}

/** Live updates from other tabs/devices. Our own pending writes are ignored. */
export function watchCloudState(uid: string, onRemote: (state: AppState) => void, onError?: (e: unknown) => void): () => void {
  return onSnapshot(
    stateDoc(uid),
    (snap) => {
      if (snap.metadata.hasPendingWrites || !snap.exists()) return;
      const state = fromCloudPayload(snap.data());
      if (state) onRemote(state);
    },
    onError,
  );
}
