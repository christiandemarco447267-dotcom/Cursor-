"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Cloud, Compass, Download, PartyPopper, RotateCcw, ShieldCheck, Upload, UserRound } from "lucide-react";
import { celebrate, prefersReducedMotion } from "@/lib/celebrate";
import { useAuth } from "@/lib/auth";
import { localDayKey } from "@/lib/market";
import { experienceLabel, focusLabel, initialsOf } from "@/lib/profile";
import { useApp } from "@/lib/store";
import { Loading, Panel, PageHeader } from "./ui";
import { AccountSecurity } from "./auth/account-security";
import { REAUTH_NOTICE_KEY } from "./auth/email-link-complete";
import { useReauth } from "./auth/reauth";

/** One-shot notice after returning from a re-auth email link. */
function takeReauthNotice(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const seen = sessionStorage.getItem(REAUTH_NOTICE_KEY) === "1";
    sessionStorage.removeItem(REAUTH_NOTICE_KEY);
    return seen;
  } catch {
    return false;
  }
}

const MAX_IMPORT_BYTES = 1_000_000;

export function SettingsView() {
  const { ready, state, actions, openTour, openProfileSetup, sync } = useApp();
  const { configured } = useAuth();
  const reauth = useReauth();
  const cloud = sync.mode === "cloud";
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(() =>
    takeReauthNotice() ? { tone: "ok", text: "Identity confirmed. You can finish your security change for the next few minutes." } : null,
  );
  const [name, setName] = useState(state?.profileName ?? "");

  if (!ready || !state) return <Loading />;

  const saveName = (event: React.FormEvent) => {
    event.preventDefault();
    actions.setProfileName(name);
    setMessage({ tone: "ok", text: name.trim() ? "Name saved." : "Name cleared." });
  };

  const exportData = () => {
    const json = actions.exportJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sentia-backup-${localDayKey(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage({ tone: "ok", text: "Backup downloaded." });
  };

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setMessage({ tone: "error", text: "File is too large (max 1 MB)." });
      return;
    }
    try {
      const text = await file.text();
      actions.importJson(text);
      setMessage({ tone: "ok", text: "Backup imported successfully." });
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Import failed." });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const reset = () => {
    const prompt = cloud
      ? "Reset your account's paper portfolio, ledger, and theses to the starting demo? This replaces what's saved in the cloud and cannot be undone."
      : "Reset your workspace to the starting demo state? This cannot be undone.";
    if (!confirm(prompt)) return;
    const doReset = async () => {
      actions.reset();
      setMessage({ tone: "ok", text: "Workspace reset to the starting demo." });
    };
    // Wiping the cloud copy is a sensitive action: require a recent sign-in (password, SMS, or email link).
    if (cloud) void reauth.run(doReset).catch(() => setMessage({ tone: "error", text: "Couldn't confirm your identity." }));
    else void doReset();
  };

  return (
    <div className="stack gap-lg animate-in">
      <PageHeader title="Settings" subtitle="Personalize your workspace and manage your data." />

      <Panel className="stack gap-md">
        <div className="row between wrap gap-sm">
          <span className="row gap-sm">
            <UserRound size={18} /> <strong>Profile</strong>
          </span>
          <button className="btn btn-sm" onClick={openProfileSetup}>
            Edit profile setup
          </button>
        </div>

        <div className="row gap-md" style={{ alignItems: "center" }}>
          <span className="avatar avatar-lg" style={{ background: state.profile.avatarColor || "#0d9488" }}>
            {initialsOf(state.profileName) || "?"}
          </span>
          <div className="stack" style={{ gap: 2, minWidth: 0 }}>
            <strong>{state.profileName || "Unnamed investor"}</strong>
            <span className="small muted">
              {[experienceLabel(state.profile.experience), focusLabel(state.profile.focus)]
                .filter(Boolean)
                .join(" · ") || "No experience or focus set yet"}
            </span>
          </div>
        </div>

        <form className="row wrap gap-sm" onSubmit={saveName}>
          <div className="field grow">
            <label htmlFor="profile-name">Your name</label>
            <input
              id="profile-name"
              name="name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
              maxLength={40}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-end" }}>
            Save name
          </button>
        </form>
        <span className="small muted">
          Used to greet you on the dashboard. {cloud ? "Saved to your account." : "Stored only in your browser."}
        </span>
      </Panel>

      <CelebrationSettings />

      {cloud ? <AccountSecurity /> : null}

      {configured && !cloud ? (
        <Panel className="row between wrap gap-sm">
          <div className="stack" style={{ gap: 2 }}>
            <span className="row gap-sm">
              <Cloud size={18} /> <strong>You&apos;re in demo mode</strong>
            </span>
            <span className="small muted">
              Everything is saved in this browser only. Create an account to keep your paper portfolio in sync across devices —
              your current workspace comes with you.
            </span>
          </div>
          <span className="row wrap gap-sm">
            <Link href="/signin?next=/app/settings" className="btn">
              Sign in
            </Link>
            <Link href="/signup" className="btn btn-primary">
              Create account
            </Link>
          </span>
        </Panel>
      ) : null}

      <Panel className="row between wrap gap-sm">
        <div className="stack" style={{ gap: 2 }}>
          <span className="row gap-sm">
            <Compass size={18} /> <strong>Getting started</strong>
          </span>
          <span className="small muted">New here? Replay the guided walkthrough of Sentia.</span>
        </div>
        <button className="btn" onClick={openTour}>
          Replay tutorial
        </button>
      </Panel>

      <Panel className="stack gap-sm">
        <span className="row gap-sm">
          <ShieldCheck size={18} /> <strong>How your data is handled</strong>
        </span>
        <ul className="muted small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
          {cloud ? (
            <li>
              Your paper account is saved to your Sentia account (Google Cloud Firestore). Only you can read or write it — access
              is enforced by security rules tied to your verified sign-in.
            </li>
          ) : (
            <li>Portfolio, ledger, theses, and profile are stored only in your browser (localStorage).</li>
          )}
          <li>Every write is validated with Zod and stored under a versioned schema with a migration path.</li>
          <li>Market requests go through a server proxy that keeps any API key server-side.</li>
          <li>Responses ship strict security headers (CSP, no-sniff, frame denial) via the proxy.</li>
        </ul>
        <span className="small muted settings-legal">
          Read the <Link href="/privacy">Privacy policy</Link> and <Link href="/terms">Terms of use</Link>.
        </span>
      </Panel>

      <div className="grid grid-3">
        <Panel className="stack gap-sm">
          <strong>Export</strong>
          <span className="small muted">Download a JSON backup of your workspace.</span>
          <button className="btn" onClick={exportData}>
            <Download size={16} /> Export JSON
          </button>
        </Panel>
        <Panel className="stack gap-sm">
          <strong>Import</strong>
          <span className="small muted">Restore from a backup file (max 1 MB).</span>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            onChange={importData}
            hidden
            aria-label="Choose a backup file to import"
          />
        </Panel>
        <Panel className="stack gap-sm">
          <strong>Reset</strong>
          <span className="small muted">
            Return to the starting demo portfolio.{cloud ? " Requires confirming your identity." : ""}
          </span>
          <button className="btn btn-danger" onClick={reset}>
            <RotateCcw size={16} /> Reset workspace
          </button>
        </Panel>
      </div>

      <div aria-live="polite">
        {message ? (
          <span className={message.tone === "ok" ? "form-ok" : "form-error"} role={message.tone === "error" ? "alert" : undefined}>
            {message.text}
          </span>
        ) : null}
      </div>
      {reauth.dialog}
    </div>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)} />;
}

/** Confetti + haptics toggles (v4). */
function CelebrationSettings() {
  const { state, actions } = useApp();
  if (!state) return null;
  const { celebrations, haptics } = state.settings;
  return (
    <Panel className="stack gap-md">
      <span className="row gap-sm">
        <PartyPopper size={18} /> <strong>Celebrations</strong>
      </span>
      <div className="switch-row">
        <span className="stack" style={{ gap: 2 }}>
          <span>Confetti</span>
          <span className="small muted">
            On a profitable thesis-backed close, a Discipline Score milestone, or beating SPY in the Time Machine.
            {prefersReducedMotion() ? " Your device asks for reduced motion, so confetti stays off." : ""}
          </span>
        </span>
        <Switch checked={celebrations} label="Confetti" onChange={(v) => actions.updateSettings({ celebrations: v })} />
      </div>
      <div className="switch-row">
        <span className="stack" style={{ gap: 2 }}>
          <span>Vibration</span>
          <span className="small muted">A short buzz on supported phones.</span>
        </span>
        <Switch checked={haptics} label="Vibration" onChange={(v) => actions.updateSettings({ haptics: v })} />
      </div>
      <button type="button" className="btn btn-sm" style={{ width: "fit-content" }} onClick={() => celebrate({ celebrations, haptics })}>
        Preview
      </button>
    </Panel>
  );
}
