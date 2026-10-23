"use client";

import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { friendlyAuthError, passwordProblem } from "@/lib/auth-helpers";
import { absoluteUrl } from "@/lib/email-link";
import { firebaseAuth } from "@/lib/firebase";
import { AuthCard, FormMessage, NotConfigured } from "./auth-card";

export function SignUpForm() {
  const { configured } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!configured) return <NotConfigured />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const problem = passwordProblem(password);
    if (problem) return setError(problem);
    if (password !== confirm) return setError("Passwords don't match.");
    setBusy(true);
    setError(null);
    try {
      const { user } = await createUserWithEmailAndPassword(firebaseAuth(), email.trim(), password);
      try {
        await sendEmailVerification(user, { url: absoluteUrl("/app") });
      } catch {
        // The verify screen offers "Resend email" if this first send fails.
      }
      router.replace("/app");
    } catch (e) {
      setError(friendlyAuthError(e));
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="Save your paper portfolio, ledger, and theses to your account. We'll email you a link to verify your address."
      footer={
        <>
          Already have an account? <Link href="/signin">Sign in</Link>
        </>
      }
    >
      <form className="stack gap-md" onSubmit={submit}>
        <div className="field">
          <label htmlFor="signup-email">Email</label>
          <input id="signup-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            className="input"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <span className="small muted">At least 8 characters, with a letter and a number.</span>
        </div>
        <div className="field">
          <label htmlFor="signup-confirm">Confirm password</label>
          <input
            id="signup-confirm"
            className="input"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </button>
        <span className="small muted">
          By creating an account you agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy policy</Link>.
        </span>
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      </form>
    </AuthCard>
  );
}
