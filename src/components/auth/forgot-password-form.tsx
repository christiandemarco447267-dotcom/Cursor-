"use client";

import { sendPasswordResetEmail } from "firebase/auth";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { errorCode, friendlyAuthError } from "@/lib/auth-helpers";
import { absoluteUrl } from "@/lib/email-link";
import { firebaseAuth } from "@/lib/firebase";
import { AuthCard, FormMessage, NotConfigured } from "./auth-card";

export function ForgotPasswordForm() {
  const { configured } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!configured) return <NotConfigured />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await sendPasswordResetEmail(firebaseAuth(), email.trim(), { url: absoluteUrl("/signin") });
      setSent(true);
    } catch (e) {
      // Don't reveal whether an account exists.
      if (errorCode(e) === "auth/user-not-found") setSent(true);
      else setError(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your account email and we'll send you a secure link to choose a new password."
      footer={<Link href="/signin">Back to sign in</Link>}
    >
      {sent ? (
        <FormMessage tone="ok">
          If an account exists for {email.trim()}, a password reset link is on its way. Check your inbox (and spam).
        </FormMessage>
      ) : (
        <form className="stack gap-md" onSubmit={submit}>
          <div className="field">
            <label htmlFor="forgot-email">Email</label>
            <input id="forgot-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
          {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        </form>
      )}
    </AuthCard>
  );
}
