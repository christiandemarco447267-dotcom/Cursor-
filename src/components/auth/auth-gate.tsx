"use client";

import { sendEmailVerification } from "firebase/auth";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Cloud, MailCheck, MonitorSmartphone } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { friendlyAuthError } from "@/lib/auth-helpers";
import { absoluteUrl } from "@/lib/email-link";
import type { StorageMode } from "@/lib/store";
import { Loading } from "../ui";
import { AuthCard, FormMessage } from "./auth-card";

const RESEND_COOLDOWN_S = 60;

/**
 * Decides where the paper account lives before the workspace mounts:
 * signed in + verified → Firestore; guest/demo → this device; otherwise asks.
 * Without Firebase config the app stays guest-only, exactly as before.
 */
export function AuthGate({ children }: { children: (mode: StorageMode) => React.ReactNode }) {
  const { configured, loading, user, emailVerified, guest } = useAuth();

  if (!configured) return <>{children({ kind: "guest" })}</>;
  if (loading) {
    return (
      <AuthCard title="Loading…">
        <Loading label="Checking your account…" />
      </AuthCard>
    );
  }
  if (user && !emailVerified) return <VerifyEmailScreen />;
  if (user) return <>{children({ kind: "cloud", uid: user.uid })}</>;
  if (guest) return <>{children({ kind: "guest" })}</>;
  return <WelcomeScreen />;
}

function WelcomeScreen() {
  const { continueAsGuest } = useAuth();
  return (
    <AuthCard title="Welcome to Sentia" subtitle="Sign in to keep your paper account in sync, or explore the demo first.">
      <div className="stack gap-sm">
        <Link href="/signin?next=/app" className="btn btn-primary">
          <Cloud size={16} /> Sign in
        </Link>
        <Link href="/signup" className="btn">
          Create an account
        </Link>
        <button type="button" className="btn" onClick={continueAsGuest}>
          <MonitorSmartphone size={16} /> Continue in demo mode
        </button>
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        Demo mode keeps everything in this browser only. If you create an account later, your demo workspace on this device
        becomes your starting point.
      </p>
    </AuthCard>
  );
}

function VerifyEmailScreen() {
  const { user, refreshUser, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Pick up verification done in another tab/device without a manual click.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refreshUser().catch(() => undefined);
    }, 5000);
    return () => clearInterval(id);
  }, [refreshUser]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const resend = async () => {
    if (!user) return;
    setBusy(true);
    setMessage(null);
    try {
      await sendEmailVerification(user, { url: absoluteUrl("/app") });
      setMessage({ tone: "ok", text: `Verification email sent to ${user.email}.` });
      setCooldown(RESEND_COOLDOWN_S);
    } catch (e) {
      setMessage({ tone: "error", text: friendlyAuthError(e) });
    } finally {
      setBusy(false);
    }
  };

  const check = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const verified = await refreshUser();
      if (!verified) setMessage({ tone: "error", text: "Not verified yet. Click the link in the email, then try again." });
    } catch (e) {
      setMessage({ tone: "error", text: friendlyAuthError(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Verify your email" subtitle="One more step before you can use your account.">
      <span className="row gap-sm">
        <MailCheck size={18} />
        <span>
          We sent a verification link to <strong>{user?.email}</strong>.
        </span>
      </span>
      <p className="small muted" style={{ margin: 0 }}>
        Open the link to confirm the address. This page updates automatically once you&apos;re verified.
      </p>
      <div className="stack gap-sm">
        <button type="button" className="btn btn-primary" onClick={check} disabled={busy}>
          I&apos;ve verified — continue
        </button>
        <button type="button" className="btn" onClick={resend} disabled={busy || cooldown > 0}>
          {cooldown > 0 ? `Resend email (${cooldown}s)` : "Resend email"}
        </button>
        <button type="button" className="btn btn-sm" onClick={() => void signOut()} disabled={busy}>
          Sign out / use a different email
        </button>
      </div>
      {message ? <FormMessage tone={message.tone}>{message.text}</FormMessage> : null}
    </AuthCard>
  );
}
