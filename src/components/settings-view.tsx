"use client";

import { useRef, useState } from "react";
import { Download, RotateCcw, ShieldCheck, Upload, UserRound } from "lucide-react";
import { localDayKey } from "@/lib/market";
import { useApp } from "@/lib/store";
import { Loading, Panel, PageHeader } from "./ui";

const MAX_IMPORT_BYTES = 1_000_000;

export function SettingsView() {
  const { ready, state, actions } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
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
    link.download = `ainvestpro-backup-${localDayKey(new Date())}.json`;
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
    if (confirm("Reset your workspace to the starting demo state? This cannot be undone.")) {
      actions.reset();
      setMessage({ tone: "ok", text: "Workspace reset to the starting demo." });
    }
  };

  return (
    <div className="stack gap-lg animate-in">
      <PageHeader title="Settings" subtitle="Personalize your workspace and manage your data." />

      <Panel className="stack gap-md">
        <span className="row gap-sm">
          <UserRound size={18} /> <strong>Profile</strong>
        </span>
        <form className="row wrap gap-sm" onSubmit={saveName}>
          <div className="field grow">
            <label htmlFor="profile-name">Your name</label>
            <input
              id="profile-name"
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
        <span className="small muted">Used to greet you on the dashboard. Stored only in your browser.</span>
      </Panel>

      <Panel className="stack gap-sm">
        <span className="row gap-sm">
          <ShieldCheck size={18} /> <strong>How your data is handled</strong>
        </span>
        <ul className="muted small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
          <li>Portfolio, goals, theses, and check-ins are stored only in your browser (localStorage).</li>
          <li>Every write is validated with Zod and stored under a versioned schema with a migration path.</li>
          <li>Market requests go through a server proxy that keeps any API key server-side.</li>
          <li>Responses ship strict security headers (CSP, no-sniff, frame denial) via the proxy.</li>
        </ul>
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
          <input ref={fileRef} type="file" accept="application/json" onChange={importData} hidden />
        </Panel>
        <Panel className="stack gap-sm">
          <strong>Reset</strong>
          <span className="small muted">Return to the starting demo portfolio.</span>
          <button className="btn btn-danger" onClick={reset}>
            <RotateCcw size={16} /> Reset workspace
          </button>
        </Panel>
      </div>

      {message ? <span className={message.tone === "ok" ? "form-ok" : "form-error"}>{message.text}</span> : null}
    </div>
  );
}
