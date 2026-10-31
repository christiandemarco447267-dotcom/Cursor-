"use client";

import { deleteUser } from "firebase/auth";
import { deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { cloudStatePath, fromCloudPayload, toCloudPayload } from "./cloud-sync";
import { cloudDocumentsFor } from "./data-deletion";
import { firebaseAuth, firestore } from "./firebase";
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

/**
 * Permanently delete the signed-in user's cloud data (paper account + league member entries)
 * and then the Firebase Authentication account itself. Firebase requires a recent sign-in for
 * deleteUser, so callers wrap this in useReauth().run(...).
 * League documents the user created (just a name) are left for the remaining members.
 */
export async function deleteCloudAccount(leagueCodes: readonly string[]): Promise<void> {
  const user = firebaseAuth().currentUser;
  if (!user) throw new Error("You're not signed in.");
  for (const path of cloudDocumentsFor(user.uid, leagueCodes)) {
    const [first, ...rest] = path;
    try {
      await deleteDoc(doc(firestore(), first, ...rest));
    } catch (error) {
      // A league you were removed from (or that no longer exists) can't block account deletion.
      if (path[0] !== "leagues") throw error;
    }
  }
  await deleteUser(user);
}
