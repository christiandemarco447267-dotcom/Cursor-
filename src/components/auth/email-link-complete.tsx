"use client";

import {
  EmailAuthProvider,
  getMultiFactorResolver,
  isSignInWithEmailLink,
  reauthenticateWithCredential,
  signInWithEmailLink,
  type MultiFactorError,
  type MultiFactorResolver,
} from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { errorCode, friendlyAuthError, safeNextPath } from "@/lib/auth-helpers";
import { EMAIL_FOR_LINK_KEY } from "@/lib/email-link";
import { firebaseAuth } from "@/lib/firebase";
import { Loading } from "../ui";
import { AuthCard, FormMessage, NotConfigured } from "./auth-card";
import { MfaChallenge } from "./mfa-challenge";

export const REAUTH_NOTICE_KEY = "sentia.reauthNotice";

type Phase = "checking" | "need-email" | "working" | "invalid" | "error" | "mfa";

/**
 * Landing page for emailed sign-in links. If someone is already signed in with
 * the same email, the link re-authenticates them (fresh auth for sensitive
 * actions); otherwise it signs them in.
 */
export function EmailLinkComplete() {
  const { configured, loading, user } = useAuth();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("checking");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resolver, setResolver] = useState<MultiFactorResolver | null>(null);
  const started = useRef(false);

  const finish = useCallback(() => {
    try {
      localStorage.removeItem(EMAIL_FOR_LINK_KEY);
    } catch {
      // ignore
    }
    const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
    router.replace(next);
  }, [router]);

  const complete = useCallback(
    async (address: string) => {
      setPhase("working");
      setError(null);
      const auth = firebaseAuth();
      const href = window.location.href;
      try {
        const current = auth.currentUser;
        if (current && current.email && current.email.toLowerCase() === address.toLowerCase()) {
          await reauthenticateWithCredential(current, EmailAuthProvider.credentialWithLink(address, href));
          try {
            sessionStorage.setItem(REAUTH_NOTICE_KEY, "1");
          } catch {
            // ignore
          }
        } else {
          await signInWithEmailLink(auth, address, href);
        }
        finish();
      } catch (e) {
        if (errorCode(e) === "auth/multi-factor-auth-required") {
          setResolver(getMultiFactorResolver(auth, e as MultiFactorError));
          setPhase("mfa");
        } else {
          setError(friendlyAuthError(e));
          setPhase("error");
        }
      }
    },
    [finish],
  );

  useEffect(() => {
    if (!configured || loading || started.current) return;
    started.current = true;
    const run = async () => {
      if (!isSignInWithEmailLink(firebaseAuth(), window.location.href)) {
        setPhase("invalid");
        return;
      }
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(EMAIL_FOR_LINK_KEY);
      } catch {
        saved = null;
      }
      const known = saved || user?.email || null;
      if (known) await complete(known);
      else setPhase("need-email");
    };
    void run();
  }, [configured, loading, user, complete]);

  if (!configured) return <NotConfigured />;

  if (phase === "mfa" && resolver) {
    return (
      <AuthCard title="Confirm it's you" subtitle="Your account has two-step verification turned on.">
        <MfaChallenge resolver={resolver} onResolved={finish} onCancel={() => router.replace("/signin")} />
      </AuthCard>
    );
  }

  if (phase === "need-email" || phase === "error") {
    return (
      <AuthCard title="Confirm your email" subtitle="For security, enter the email address this link was sent to.">
        <form
          className="stack gap-md"
          onSubmit={(e) => {
            e.preventDefault();
            void complete(email.trim());
          }}
        >
          <div className="field">
            <label htmlFor="link-email">Email</label>
            <input id="link-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary">
            Continue
          </button>
          {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        </form>
      </AuthCard>
    );
  }

  if (phase === "invalid") {
    return (
      <AuthCard title="Link not valid" subtitle="This sign-in link is invalid, expired, or was already used.">
        <Link href="/signin" className="btn btn-primary">
          Back to sign in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Signing you in…">
      <Loading label="Checking your link…" />
    </AuthCard>
  );
}
