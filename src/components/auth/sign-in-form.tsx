"use client";

import { getMultiFactorResolver, signInWithEmailAndPassword, type MultiFactorError, type MultiFactorResolver } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { errorCode, friendlyAuthError, safeNextPath } from "@/lib/auth-helpers";
import { sendEmailLink } from "@/lib/email-link";
import { firebaseAuth } from "@/lib/firebase";
import { AuthCard, FormMessage, NotConfigured } from "./auth-card";
import { MfaChallenge } from "./mfa-challenge";

function nextFromLocation(): string {
  if (typeof window === "undefined") return "/app";
  return safeNextPath(new URLSearchParams(window.location.search).get("next"));
}

export function SignInForm() {
  const { configured } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resolver, setResolver] = useState<MultiFactorResolver | null>(null);

  if (!configured) return <NotConfigured />;

  const done = () => router.replace(nextFromLocation());

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await signInWithEmailAndPassword(firebaseAuth(), email.trim(), password);
      done();
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
    if (!email.trim()) {
      setError("Enter your email first, then request a sign-in link.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await sendEmailLink(email.trim(), nextFromLocation());
      setNotice(`We sent a sign-in link to ${email.trim()}. Open it on this device to continue.`);
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  if (resolver) {
    return (
      <AuthCard title="Confirm it's you" subtitle="Your account has two-step verification turned on.">
        <MfaChallenge resolver={resolver} onResolved={done} onCancel={() => setResolver(null)} />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Sign in"
      subtitle="Your paper account syncs across devices when you're signed in."
      footer={
        <>
          New to Sentia? <Link href="/signup">Create an account</Link> · <Link href="/app">Try the demo</Link>
        </>
      }
    >
      <form className="stack gap-md" onSubmit={submit}>
        <div className="field">
          <label htmlFor="signin-email">Email</label>
          <input id="signin-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="signin-password">Password</label>
          <input
            id="signin-password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <div className="row between wrap gap-sm small">
          <Link href="/forgot-password">Forgot password?</Link>
          <button type="button" className="btn btn-sm" onClick={emailLink} disabled={busy}>
            Email me a sign-in link
          </button>
        </div>
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        {notice ? <FormMessage tone="ok">{notice}</FormMessage> : null}
      </form>
    </AuthCard>
  );
}
