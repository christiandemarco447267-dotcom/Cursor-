"use client";

import { sendSignInLinkToEmail } from "firebase/auth";
import { BASE_PATH } from "./asset";
import { firebaseAuth } from "./firebase";

export const EMAIL_FOR_LINK_KEY = "sentia.emailForSignIn";
const IS_STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";
// Static builds use trailingSlash, so link straight to the canonical URL (no redirect hop).
export const EMAIL_LINK_PATH = IS_STATIC_EXPORT ? "/auth/email-link/" : "/auth/email-link";

export function absoluteUrl(path: string): string {
  return `${window.location.origin}${BASE_PATH}${path}`;
}

/**
 * Email a one-time sign-in link. Used for passwordless sign-in and to re-confirm
 * identity (by email) before sensitive actions. Requires the "Email link
 * (passwordless sign-in)" option of the Email/Password provider.
 */
export async function sendEmailLink(email: string, next: string): Promise<void> {
  await sendSignInLinkToEmail(firebaseAuth(), email, {
    url: `${absoluteUrl(EMAIL_LINK_PATH)}?next=${encodeURIComponent(next)}`,
    handleCodeInApp: true,
  });
  try {
    localStorage.setItem(EMAIL_FOR_LINK_KEY, email);
  } catch {
    // The completion page will ask for the email instead.
  }
}
