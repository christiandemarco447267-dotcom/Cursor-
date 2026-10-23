"use client";

import {
  EmailAuthProvider,
  getMultiFactorResolver,
  reauthenticateWithCredential,
  type MultiFactorError,
  type MultiFactorResolver,
} from "firebase/auth";
import { useCallback, useState } from "react";
import { KeyRound, Mail } from "lucide-react";
import { errorCode, friendlyAuthError, isRecentAuth } from "@/lib/auth-helpers";
import { sendEmailLink } from "@/lib/email-link";
import { firebaseAuth } from "@/lib/firebase";
import { FormMessage } from "./auth-card";
import { MfaChallenge } from "./mfa-challenge";

/**
 * Gate for sensitive actions (change password, reset the cloud workspace,
 * change two-step settings). If the user signed in more than a few minutes ago
 * they must re-confirm: with their password (+ SMS code if enrolled) or with a
 * one-time link sent to their verified email.
 */
export function useReauth(returnPath = "/app/settings") {
  const [pending, setPending] = useState<{ action: () => Promise<void> } | null>(null);

  const run = useCallback(async (action: () => Promise<void>) => {
    const user = firebaseAuth().currentUser;
    if (!user) return;
    const token = await user.getIdTokenResult();
    if (isRecentAuth(token.authTime)) {
      try {
        await action();
        return;
      } catch (e) {
        if (errorCode(e) !== "auth/requires-recent-login") throw e;
      }
    }
    setPending({ action });
  }, []);

  const dialog = pending ? (
    <ReauthDialog
      returnPath={returnPath}
      onCancel={() => setPending(null)}
      onConfirmed={async () => {
        const { action } = pending;
        setPending(null);
        await action();
      }}
    />
  ) : null;

  return { run, dialog };
}

function ReauthDialog({
  returnPath,
  onConfirmed,
  onCancel,
}: {
  returnPath: string;
  onConfirmed: () => Promise<void>;
  onCancel: () => void;
}) {
  const user = firebaseAuth().currentUser;
  const hasPassword = Boolean(user?.providerData.some((p) => p.providerId === EmailAuthProvider.PROVIDER_ID));
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resolver, setResolver] = useState<MultiFactorResolver | null>(null);

  const confirmPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.email) return;
    setBusy(true);
    setError(null);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
      await onConfirmed();
    } catch (e) {
      if (errorCode(e) === "auth/multi-factor-auth-required") {
        setResolver(getMultiFactorResolver(firebaseAuth(), e as MultiFactorError));
      } else {
        setError(friendlyAuthError(e));
      }
      setBusy(false);
    }
  };

  const emailLink = async () => {
    if (!user?.email) return;
    setBusy(true);
    setError(null);
    try {
      await sendEmailLink(user.email, returnPath);
      setNotice(`We emailed a one-time confirmation link to ${user.email}. Open it on this device, then repeat the action.`);
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" role="presentation" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal stack gap-md" role="dialog" aria-modal="true" aria-labelledby="reauth-title">
        <div className="stack" style={{ gap: 4 }}>
          <h2 id="reauth-title" style={{ margin: 0, fontSize: 20 }}>
            Confirm it&apos;s you
          </h2>
          <p className="muted small" style={{ margin: 0 }}>
            This is a sensitive change, so we need to check your identity again.
          </p>
        </div>

        {resolver ? (
          <MfaChallenge resolver={resolver} onResolved={() => void onConfirmed()} onCancel={() => setResolver(null)} />
        ) : (
          <>
            {hasPassword ? (
              <form className="stack gap-sm" onSubmit={confirmPassword}>
                <div className="field">
                  <label htmlFor="reauth-password">
                    <KeyRound size={14} /> Password
                  </label>
                  <input
                    id="reauth-password"
                    className="input"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? "Checking…" : "Confirm with password"}
                </button>
              </form>
            ) : null}
            <button type="button" className="btn" onClick={emailLink} disabled={busy}>
              <Mail size={16} /> Email me a confirmation link instead
            </button>
            <button type="button" className="btn btn-sm" onClick={onCancel} disabled={busy}>
              Cancel
            </button>
          </>
        )}
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        {notice ? <FormMessage tone="ok">{notice}</FormMessage> : null}
      </div>
    </div>
  );
}
