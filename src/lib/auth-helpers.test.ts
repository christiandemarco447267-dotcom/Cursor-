import assert from "node:assert/strict";
import { test } from "node:test";
import {
  friendlyAuthError,
  isMfaNotEnabledError,
  isRecentAuth,
  MFA_NOT_ENABLED_MESSAGE,
  normalizePhoneNumber,
  passwordProblem,
  safeNextPath,
} from "./auth-helpers";

test("safeNextPath only allows same-site paths", () => {
  assert.equal(safeNextPath("/app/settings"), "/app/settings");
  assert.equal(safeNextPath(null), "/app");
  assert.equal(safeNextPath("https://evil.example"), "/app");
  assert.equal(safeNextPath("//evil.example"), "/app");
  assert.equal(safeNextPath("/\\evil.example"), "/app");
  assert.equal(safeNextPath("/app\r\nSet-Cookie: x"), "/app");
});

test("isRecentAuth honours the window and rejects bad input", () => {
  const now = Date.parse("2026-10-23T12:00:00Z");
  assert.equal(isRecentAuth("2026-10-23T11:58:00Z", now), true);
  assert.equal(isRecentAuth("2026-10-23T11:50:00Z", now), false);
  assert.equal(isRecentAuth(undefined, now), false);
  assert.equal(isRecentAuth("not a date", now), false);
});

test("normalizePhoneNumber produces E.164", () => {
  assert.equal(normalizePhoneNumber("(555) 123-4567"), "+15551234567");
  assert.equal(normalizePhoneNumber("+44 20 7946 0958"), "+442079460958");
  assert.equal(normalizePhoneNumber("12"), null);
  assert.equal(normalizePhoneNumber("+0123456789"), null);
});

test("passwordProblem enforces a basic policy", () => {
  assert.ok(passwordProblem("short1"));
  assert.ok(passwordProblem("allletters"));
  assert.equal(passwordProblem("letters1234"), null);
});

test("MFA-not-enabled errors are recognised and explained", () => {
  assert.equal(isMfaNotEnabledError("auth/operation-not-allowed"), true);
  assert.equal(isMfaNotEnabledError("auth/internal-error", "SMS based MFA not enabled"), true);
  assert.equal(isMfaNotEnabledError("auth/internal-error", "boom"), false);
  assert.equal(isMfaNotEnabledError("auth/invalid-verification-code"), false);
  const err = Object.assign(new Error("Firebase: Error (auth/operation-not-allowed)."), { code: "auth/operation-not-allowed" });
  assert.equal(friendlyAuthError(err), MFA_NOT_ENABLED_MESSAGE);
});

test("friendlyAuthError maps known codes and never leaks raw messages", () => {
  assert.equal(friendlyAuthError({ code: "auth/invalid-credential" }), "Email or password is incorrect.");
  assert.equal(friendlyAuthError(new Error("internal stack details"), "fallback"), "fallback");
});
