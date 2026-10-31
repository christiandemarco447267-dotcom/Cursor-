"use client";

import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";

/**
 * Firebase client config, read from NEXT_PUBLIC_FIREBASE_* env vars at build time.
 * Each var is referenced literally so Next.js can inline it into the client bundle.
 * These values identify the project; they are not secrets (access is enforced by
 * Firebase Auth + firestore.rules).
 */
export const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Accounts are enabled only when the minimum config is present; otherwise the app is guest-only.
 *
 * In the app-store build (NEXT_PUBLIC_APP_TARGET=native) accounts stay OFF unless
 * NEXT_PUBLIC_NATIVE_FIREBASE=true is also set: the web sign-in flows (email links, reCAPTCHA
 * for SMS two-step) need native-compatible setup first — authorized domains for
 * capacitor://localhost and https://localhost, app-scheme email-link handling, and ideally the
 * @capacitor-firebase/authentication plugin. See STORE_RELEASE.md → "Accounts in the app".
 * With accounts off the app runs fully on-device, so there is no account to delete.
 */
export function accountsEnabledFor(config: FirebaseOptions, env: { target?: string; nativeFirebase?: string }): boolean {
  const complete = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
  if (!complete) return false;
  if (env.target === "native") return env.nativeFirebase === "true";
  return true;
}

export const isFirebaseConfigured = accountsEnabledFor(firebaseConfig, {
  target: process.env.NEXT_PUBLIC_APP_TARGET,
  nativeFirebase: process.env.NEXT_PUBLIC_NATIVE_FIREBASE,
});

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export function firebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured) throw new Error("Firebase is not configured.");
  if (!app) app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return app;
}

export function firebaseAuth(): Auth {
  return getAuth(firebaseApp());
}

export function firestore(): Firestore {
  if (!db) {
    const instance = firebaseApp();
    try {
      // Optional schema fields (e.g. holding.thesisId) may be undefined; Firestore rejects those by default.
      db = initializeFirestore(instance, { ignoreUndefinedProperties: true });
    } catch {
      db = getFirestore(instance); // already initialized (e.g. fast refresh)
    }
  }
  return db;
}
