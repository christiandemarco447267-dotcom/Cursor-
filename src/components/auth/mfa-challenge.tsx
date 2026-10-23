"use client";

import {
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  type MultiFactorResolver,
  type PhoneMultiFactorInfo,
  type RecaptchaVerifier,
  type UserCredential,
} from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { MessageSquareLock } from "lucide-react";
import { friendlyAuthError } from "@/lib/auth-helpers";
import { firebaseAuth } from "@/lib/firebase";
import { clearRecaptcha, createInvisibleRecaptcha } from "@/lib/recaptcha";
import { FormMessage } from "./auth-card";

/**
 * Second step for an account with SMS two-step verification. Works for both
 * sign-in and re-authentication (both surface auth/multi-factor-auth-required).
 */
export function MfaChallenge({
  resolver,
  onResolved,
  onCancel,
}: {
  resolver: MultiFactorResolver;
  onResolved: (credential: UserCredential) => void;
  onCancel: () => void;
}) {
  const phoneHint = resolver.hints.find((h) => h.factorId === PhoneMultiFactorGenerator.FACTOR_ID) as PhoneMultiFactorInfo | undefined;
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => clearRecaptcha(verifierRef.current), []);

  const sendCode = async () => {
    if (!phoneHint || !recaptchaRef.current) return;
    setBusy(true);
    setError(null);
    try {
      clearRecaptcha(verifierRef.current);
      verifierRef.current = createInvisibleRecaptcha(recaptchaRef.current);
      const id = await new PhoneAuthProvider(firebaseAuth()).verifyPhoneNumber(
        { multiFactorHint: phoneHint, session: resolver.session },
        verifierRef.current,
      );
      setVerificationId(id);
    } catch (e) {
      setError(friendlyAuthError(e, "Couldn't send the code. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!verificationId) return;
    setBusy(true);
    setError(null);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, code.trim());
      const result = await resolver.resolveSignIn(PhoneMultiFactorGenerator.assertion(credential));
      onResolved(result);
    } catch (e) {
      setError(friendlyAuthError(e, "Couldn't verify that code."));
      setBusy(false);
    }
  };

  if (!phoneHint) {
    return (
      <div className="stack gap-md">
        <FormMessage tone="error">
          This account uses a second factor Sentia doesn&apos;t support yet. Contact support to recover access.
        </FormMessage>
        <button type="button" className="btn" onClick={onCancel}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="stack gap-md">
      <span className="row gap-sm">
        <MessageSquareLock size={18} /> <strong>Two-step verification</strong>
      </span>
      <p className="muted small" style={{ margin: 0 }}>
        We&apos;ll text a 6-digit code to <strong>{phoneHint.phoneNumber}</strong>.
      </p>
      {verificationId ? (
        <form className="stack gap-sm" onSubmit={verify}>
          <div className="field">
            <label htmlFor="mfa-code">Verification code</label>
            <input
              id="mfa-code"
              className="input"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoFocus
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy || code.length !== 6}>
            {busy ? "Verifying…" : "Verify and continue"}
          </button>
          <button type="button" className="btn btn-sm" onClick={sendCode} disabled={busy}>
            Resend code
          </button>
        </form>
      ) : (
        <button type="button" className="btn btn-primary" onClick={sendCode} disabled={busy}>
          {busy ? "Sending…" : "Text me a code"}
        </button>
      )}
      <button type="button" className="btn btn-sm" onClick={onCancel} disabled={busy}>
        Cancel
      </button>
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      <div ref={recaptchaRef} />
    </div>
  );
}
