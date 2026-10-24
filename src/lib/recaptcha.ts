"use client";

import { RecaptchaVerifier } from "firebase/auth";
import { firebaseAuth } from "./firebase";

/**
 * Invisible reCAPTCHA required by Firebase phone auth (SMS MFA enroll + sign-in).
 * Create one per send, against an empty container element, and clear it after.
 */
export function createInvisibleRecaptcha(container: HTMLElement): RecaptchaVerifier {
  container.innerHTML = "";
  const host = document.createElement("div");
  container.appendChild(host);
  return new RecaptchaVerifier(firebaseAuth(), host, { size: "invisible" });
}

export function clearRecaptcha(verifier: RecaptchaVerifier | null) {
  try {
    verifier?.clear();
  } catch {
    // already cleared
  }
}
