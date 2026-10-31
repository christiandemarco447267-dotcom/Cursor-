"use client";

import Link from "next/link";
import { useState } from "react";
import { Info, LifeBuoy, Trash2 } from "lucide-react";
import { assetPath } from "@/lib/asset";
import { useAuth } from "@/lib/auth";
import { deleteCloudAccount } from "@/lib/cloud-store";
import { DELETE_CONFIRM_WORD, deleteConfirmationMatches, wipeLocalData } from "@/lib/data-deletion";
import { APP_VERSION } from "@/lib/api-config";
import { friendlyAuthError } from "@/lib/auth-helpers";
import { isNativeBuild } from "@/lib/platform";
import { SIM_DISCLAIMER } from "@/lib/site";
import { deactivateStore, useApp } from "@/lib/store";
import { Panel } from "./ui";
import { useReauth } from "./auth/reauth";

/** Settings → About: version, the simulation disclaimer, and where to get help. */
export function AboutPanel() {
  return (
    <Panel className="stack gap-sm">
      <span className="row gap-sm">
        <Info size={18} /> <strong>About Sentia</strong>
      </span>
      <p className="sim-disclaimer" role="note">
        {SIM_DISCLAIMER}
      </p>
      <span className="small muted">
        Sentia is an educational simulator. Prices, orders and balances are pretend; nothing you do here buys or sells real
        securities, and no money is ever deposited, won or paid out. Version {APP_VERSION}
        {isNativeBuild() ? " (app)" : ""}.
      </span>
      <span className="row wrap gap-sm small settings-legal">
        <Link href="/support" className="row gap-sm" style={{ display: "inline-flex", gap: 4 }}>
          <LifeBuoy size={14} aria-hidden="true" /> Help &amp; support
        </Link>
        <Link href="/privacy">Privacy policy</Link>
        <Link href="/terms">Terms of use</Link>
        <Link href="/delete-account">Deleting your data</Link>
      </span>
    </Panel>
  );
}

/**
 * Settings → Delete my data. Wipes everything on this device; when signed in it first deletes the
 * cloud copy, league entries and the account itself (after a fresh sign-in, which Firebase requires).
 */
export function DeleteDataPanel() {
  const { state } = useApp();
  const { user } = useAuth();
  const reauth = useReauth();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signedIn = Boolean(user);

  const finish = async () => {
    deactivateStore();
    await wipeLocalData();
    window.location.replace(assetPath("/app/"));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!deleteConfirmationMatches(typed) || busy) return;
    setError(null);
    setBusy(true);
    const leagues = state?.leagues ?? [];
    const run = signedIn
      ? reauth.run(async () => {
          await deleteCloudAccount(leagues);
          await finish();
        })
      : finish();
    void Promise.resolve(run)
      .catch((e: unknown) => setError(friendlyAuthError(e, "Couldn't delete your data. Nothing was removed from this device.")))
      .finally(() => setBusy(false));
  };

  return (
    <Panel className="stack gap-sm danger-zone">
      <span className="row gap-sm">
        <Trash2 size={18} /> <strong>Delete my data</strong>
      </span>
      <span className="small muted">
        {signedIn
          ? "Permanently deletes your Sentia account, your paper portfolio saved in the cloud, your league entries, and everything stored on this device. This can't be undone."
          : "Permanently deletes your paper portfolio, trades, theses, profile, preferences and offline copies stored on this device. Nothing about you is kept on a server. This can't be undone."}{" "}
        <Link href="/delete-account">How deletion works</Link>
      </span>
      {open ? (
        <form className="stack gap-sm" onSubmit={submit}>
          <div className="field">
            <label htmlFor="delete-confirm">Type {DELETE_CONFIRM_WORD} to confirm</label>
            <input
              id="delete-confirm"
              className="input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              enterKeyHint="done"
            />
          </div>
          <span className="row wrap gap-sm">
            <button type="submit" className="btn btn-danger" disabled={!deleteConfirmationMatches(typed) || busy}>
              <Trash2 size={16} /> {busy ? "Deleting…" : signedIn ? "Delete account and data" : "Delete all data"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setOpen(false);
                setTyped("");
                setError(null);
              }}
            >
              Cancel
            </button>
          </span>
        </form>
      ) : (
        <button type="button" className="btn btn-danger" style={{ width: "fit-content" }} onClick={() => setOpen(true)}>
          <Trash2 size={16} /> Delete my data…
        </button>
      )}
      {error ? (
        <span className="form-error" role="alert">
          {error}
        </span>
      ) : null}
      {reauth.dialog}
    </Panel>
  );
}
