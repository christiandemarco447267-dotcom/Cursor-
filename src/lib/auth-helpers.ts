// Framework-free helpers for the account flows (unit-tested; no Firebase imports).

/** Keep redirects on-site: only same-origin absolute paths are allowed. */
export function safeNextPath(raw: string | null | undefined, fallback = "/app"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (/[\r\n]/.test(raw)) return fallback;
  return raw;
}

/** Sensitive actions require a sign-in (or re-auth) within this window. */
export const RECENT_AUTH_MAX_AGE_MS = 5 * 60 * 1000;

export function isRecentAuth(authTime: string | number | Date | null | undefined, now = Date.now(), maxAgeMs = RECENT_AUTH_MAX_AGE_MS): boolean {
  if (authTime === null || authTime === undefined || authTime === "") return false;
  const t = authTime instanceof Date ? authTime.getTime() : new Date(authTime).getTime();
  if (!Number.isFinite(t)) return false;
  return now - t >= -60_000 && now - t <= maxAgeMs; // tolerate small clock skew
}

/** E.164: + then 8–15 digits. Spaces, dashes, dots and parentheses are stripped first. */
export function normalizePhoneNumber(raw: string): string | null {
  const cleaned = raw.trim().replace(/[\s().-]/g, "");
  const withPlus = cleaned.startsWith("+") ? cleaned : /^\d{10}$/.test(cleaned) ? `+1${cleaned}` : `+${cleaned}`;
  return /^\+[1-9]\d{7,14}$/.test(withPlus) ? withPlus : null;
}

export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  if (password.length > 128) return "Use at most 128 characters.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Include at least one letter and one number.";
  return null;
}

const MFA_NOT_ENABLED_HINTS = [/multi-?factor/i, /\bmfa\b/i, /sms/i, /phone/i];

/** True when an error says SMS second factors aren't enabled on the Firebase project. */
export function isMfaNotEnabledError(code: string | undefined, message = ""): boolean {
  if (code === "auth/operation-not-allowed" || code === "auth/admin-restricted-operation") {
    return true;
  }
  if (code === "auth/internal-error" || code === "auth/invalid-tenant-id" || code === "auth/unsupported-first-factor") {
    return MFA_NOT_ENABLED_HINTS.some((re) => re.test(message));
  }
  return false;
}

export const MFA_NOT_ENABLED_MESSAGE =
  "Text-message two-step verification isn't turned on for this Sentia project yet. Your account is still protected by your password and a verified email.";

const MESSAGES: Record<string, string> = {
  "auth/invalid-email": "That email address doesn't look right.",
  "auth/missing-email": "Enter your email address.",
  "auth/missing-password": "Enter your password.",
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/wrong-password": "Email or password is incorrect.",
  "auth/user-not-found": "Email or password is incorrect.",
  "auth/invalid-login-credentials": "Email or password is incorrect.",
  "auth/email-already-in-use": "An account with this email already exists. Try signing in instead.",
  "auth/weak-password": "Choose a stronger password (at least 8 characters with letters and numbers).",
  "auth/password-does-not-meet-requirements": "That password doesn't meet this project's password policy.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
  "auth/requires-recent-login": "For your security, confirm it's you before doing that.",
  "auth/invalid-phone-number": "Enter a valid phone number including country code, e.g. +1 555 123 4567.",
  "auth/missing-phone-number": "Enter a phone number.",
  "auth/invalid-verification-code": "That code isn't right. Check the text message and try again.",
  "auth/missing-verification-code": "Enter the 6-digit code from the text message.",
  "auth/code-expired": "That code has expired. Send a new one.",
  "auth/captcha-check-failed": "The security check failed. Please try again.",
  "auth/quota-exceeded": "Text messages are temporarily unavailable (quota reached). Try again later.",
  "auth/second-factor-already-in-use": "This phone number is already enrolled on your account.",
  "auth/maximum-second-factor-count-exceeded": "You've reached the maximum number of second factors.",
  "auth/unverified-email": "Verify your email address before turning on two-step verification.",
  "auth/expired-action-code": "That link has expired. Request a new one.",
  "auth/invalid-action-code": "That link is invalid or was already used. Request a new one.",
  "auth/user-mismatch": "That link belongs to a different account than the one signed in.",
  "auth/unauthorized-continue-uri": "This site's domain isn't authorized in the Firebase project (Authentication → Settings → Authorized domains).",
  "auth/unauthorized-domain": "This site's domain isn't authorized in the Firebase project (Authentication → Settings → Authorized domains).",
  "auth/popup-closed-by-user": "The window was closed before finishing.",
  "permission-denied": "You don't have access to that data. Make sure your email is verified, then sign in again.",
  unavailable: "Can't reach the server right now. Your changes will sync when you're back online.",
};

/** Turn a Firebase (or any) error into a short, user-facing message. */
export function friendlyAuthError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : undefined;
  const message = error instanceof Error ? error.message : "";
  if (isMfaNotEnabledError(code, message)) {
    // operation-not-allowed is also what you get when an auth *provider* is disabled.
    if (code === "auth/operation-not-allowed" && /email|password|link/i.test(message) && !/mfa|multi|sms|phone/i.test(message)) {
      return "That sign-in method isn't enabled for this Sentia project.";
    }
    return MFA_NOT_ENABLED_MESSAGE;
  }
  if (code && MESSAGES[code]) return MESSAGES[code];
  return fallback;
}

export function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : undefined;
}
