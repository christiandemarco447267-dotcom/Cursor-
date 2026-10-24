"use client";

import {
  multiFactor,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  sendPasswordResetEmail,
  updatePassword,
  type MultiFactorInfo,
  type RecaptchaVerifier,
} from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Cloud, KeyRound, LogOut, MessageSquareLock, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  errorCode,
  friendlyAuthError,
  isMfaNotEnabledError,
  MFA_NOT_ENABLED_MESSAGE,
  normalizePhoneNumber,
  passwordProblem,
} from "@/lib/auth-helpers";
import { absoluteUrl } from "@/lib/email-link";
import { firebaseAuth } from "@/lib/firebase";
import { clearRecaptcha, createInvisibleRecaptcha } from "@/lib/recaptcha";
import { useApp } from "@/lib/store";
import { Panel } from "../ui";
import { FormMessage } from "./auth-card";
import { useReauth } from "./reauth";

type Msg = { tone: "ok" | "error"; text: string } | null;

const SYNC_LABEL: Record<string, string> = {
  loading: "Loading from the cloud…",
  saving: "Saving…",
  saved: "All changes saved to your account",
  error: "Sync problem",
  local: "Saved on this device",
};

/** Settings → Account & security (only rendered for signed-in users). */
export function AccountSecurity() {
  const { user, signOut } = useAuth();
  const { sync } = useApp();
  const router = useRouter();
  const reauth = useReauth();
  if (!user) return null;

  return (
    <Panel className="stack gap-md">
      <div className="row between wrap gap-sm">
        <span className="row gap-sm">
          <Cloud size={18} /> <strong>Account &amp; security</strong>
        </span>
        <button
          className="btn btn-sm"
          onClick={async () => {
            await signOut();
            router.replace("/signin");
          }}
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
      <div className="stack" style={{ gap: 2 }}>
        <span className="row gap-sm">
          <strong>{user.email}</strong>
          {user.emailVerified ? (
            <span className="badge badge-gain">
              <BadgeCheck size={13} /> Verified
            </span>
          ) : null}
        </span>
        <span className="small muted" role="status">
          {SYNC_LABEL[sync.status] ?? ""}
          {sync.status === "error" && sync.error ? ` — ${sync.error}` : ""}
        </span>
      </div>
      <PasswordSection run={reauth.run} />
      <PhoneMfaSection run={reauth.run} />
      {reauth.dialog}
    </Panel>
  );
}

type Run = (action: () => Promise<void>) => Promise<void>;

function PasswordSection({ run }: { run: Run }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const change = (event: React.FormEvent) => {
    event.preventDefault();
    const problem = passwordProblem(password);
    if (problem) return setMsg({ tone: "error", text: problem });
    setBusy(true);
    setMsg(null);
    void run(async () => {
      const current = firebaseAuth().currentUser;
      if (!current) return;
      try {
        await updatePassword(current, password);
        setPassword("");
        setOpen(false);
        setMsg({ tone: "ok", text: "Password updated." });
      } catch (e) {
        if (errorCode(e) === "auth/requires-recent-login") throw e;
        setMsg({ tone: "error", text: friendlyAuthError(e) });
      }
    })
      .catch((e) => setMsg({ tone: "error", text: friendlyAuthError(e) }))
      .finally(() => setBusy(false));
  };

  const sendReset = async () => {
    if (!user?.email) return;
    setBusy(true);
    setMsg(null);
    try {
      await sendPasswordResetEmail(firebaseAuth(), user.email, { url: absoluteUrl("/signin") });
      setMsg({ tone: "ok", text: `Password reset link sent to ${user.email}.` });
    } catch (e) {
      setMsg({ tone: "error", text: friendlyAuthError(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack gap-sm">
      <span className="row gap-sm">
        <KeyRound size={16} /> <strong>Password</strong>
      </span>
      {open ? (
        <form className="row wrap gap-sm" onSubmit={change}>
          <div className="field grow">
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              className="input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-end" }} disabled={busy}>
            Update
          </button>
        </form>
      ) : (
        <div className="row wrap gap-sm">
          <button className="btn btn-sm" onClick={() => setOpen(true)}>
            Change password
          </button>
          <button className="btn btn-sm" onClick={sendReset} disabled={busy}>
            Email me a reset link
          </button>
        </div>
      )}
      {msg ? <FormMessage tone={msg.tone}>{msg.text}</FormMessage> : null}
    </div>
  );
}

function PhoneMfaSection({ run }: { run: Run }) {
  const { user, refreshUser } = useAuth();
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const [phone, setPhone] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [notEnabled, setNotEnabled] = useState(false);
  const [factors, setFactors] = useState<MultiFactorInfo[]>(() => (user ? multiFactor(user).enrolledFactors : []));

  useEffect(() => () => clearRecaptcha(verifierRef.current), []);

  if (!user) return null;

  const handleError = (e: unknown) => {
    const message = e instanceof Error ? e.message : "";
    if (isMfaNotEnabledError(errorCode(e), message)) {
      setNotEnabled(true);
      setMsg(null);
    } else {
      setMsg({ tone: "error", text: friendlyAuthError(e) });
    }
  };

  const sendCode = (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = normalizePhoneNumber(phone);
    if (!normalized) return setMsg({ tone: "error", text: "Enter a valid phone number with country code, e.g. +1 555 123 4567." });
    setBusy(true);
    setMsg(null);
    void run(async () => {
      const current = firebaseAuth().currentUser;
      if (!current || !recaptchaRef.current) return;
      try {
        const session = await multiFactor(current).getSession();
        clearRecaptcha(verifierRef.current);
        verifierRef.current = createInvisibleRecaptcha(recaptchaRef.current);
        const id = await new PhoneAuthProvider(firebaseAuth()).verifyPhoneNumber({ phoneNumber: normalized, session }, verifierRef.current);
        setVerificationId(id);
        setMsg({ tone: "ok", text: `Code sent to ${normalized}.` });
      } catch (e) {
        if (errorCode(e) === "auth/requires-recent-login") throw e;
        handleError(e);
      }
    })
      .catch(handleError)
      .finally(() => setBusy(false));
  };

  const confirmCode = async (event: React.FormEvent) => {
    event.preventDefault();
    const current = firebaseAuth().currentUser;
    if (!current || !verificationId) return;
    setBusy(true);
    setMsg(null);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, code.trim());
      await multiFactor(current).enroll(PhoneMultiFactorGenerator.assertion(credential), "Phone");
      setFactors([...multiFactor(current).enrolledFactors]);
      setVerificationId(null);
      setCode("");
      setPhone("");
      setMsg({ tone: "ok", text: "Two-step verification is on. We'll text you a code when you sign in." });
      await refreshUser().catch(() => undefined);
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(false);
    }
  };

  const remove = (factor: MultiFactorInfo) => {
    if (!confirm("Turn off two-step verification for this phone?")) return;
    setBusy(true);
    setMsg(null);
    void run(async () => {
      const current = firebaseAuth().currentUser;
      if (!current) return;
      try {
        await multiFactor(current).unenroll(factor);
        setFactors([...multiFactor(current).enrolledFactors]);
        setMsg({ tone: "ok", text: "Two-step verification removed for that phone." });
      } catch (e) {
        const code = errorCode(e);
        if (code === "auth/requires-recent-login") throw e;
        if (code === "auth/user-token-expired") {
          setMsg({ tone: "ok", text: "Two-step verification removed. Please sign in again." });
          return;
        }
        handleError(e);
      }
    })
      .catch(handleError)
      .finally(() => setBusy(false));
  };

  const phoneFactors = factors.filter((f) => f.factorId === PhoneMultiFactorGenerator.FACTOR_ID);

  return (
    <div className="stack gap-sm">
      <span className="row gap-sm">
        <MessageSquareLock size={16} /> <strong>Two-step verification (SMS)</strong>
      </span>
      <span className="small muted">
        Your email is verified, and sensitive changes ask you to confirm by password or a one-time email link. Add your phone
        for a text-message code at every sign-in.
      </span>

      {notEnabled ? (
        <FormMessage tone="error">{MFA_NOT_ENABLED_MESSAGE}</FormMessage>
      ) : phoneFactors.length ? (
        <ul className="list" style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {phoneFactors.map((f) => (
            <li key={f.uid} className="row between wrap gap-sm">
              <span>
                {"phoneNumber" in f ? String((f as { phoneNumber?: string }).phoneNumber) : f.displayName || "Phone"}
                <span className="small muted"> · added {new Date(f.enrollmentTime).toLocaleDateString()}</span>
              </span>
              <button className="btn btn-sm btn-danger" onClick={() => remove(f)} disabled={busy}>
                <Trash2 size={14} /> Remove
              </button>
            </li>
          ))}
        </ul>
      ) : verificationId ? (
        <form className="row wrap gap-sm" onSubmit={confirmCode}>
          <div className="field grow">
            <label htmlFor="enroll-code">Code from the text message</label>
            <input
              id="enroll-code"
              className="input"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-end" }} disabled={busy || code.length !== 6}>
            Turn on
          </button>
        </form>
      ) : (
        <form className="row wrap gap-sm" onSubmit={sendCode}>
          <div className="field grow">
            <label htmlFor="enroll-phone">Mobile number</label>
            <input
              id="enroll-phone"
              className="input"
              type="tel"
              autoComplete="tel"
              placeholder="+1 555 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn" style={{ alignSelf: "flex-end" }} disabled={busy}>
            {busy ? "Sending…" : "Send code"}
          </button>
        </form>
      )}
      {msg ? <FormMessage tone={msg.tone}>{msg.text}</FormMessage> : null}
      <div ref={recaptchaRef} />
    </div>
  );
}
