"use client";

import { useRef, useState } from "react";
import { useApp } from "@/lib/app-context";
import { Button, PageHeader, Panel } from "@/components/ui";

export function SettingsView() {
  const { exportAction, importAction, resetAction } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  function download() {
    const blob = new Blob([exportAction()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ainvestpro-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Backup downloaded. Keep it private — it contains your portfolio notes.");
  }

  async function onImport(file: File | null) {
    if (!file) return;
    if (file.size > 1_000_000) {
      setMessage("File too large.");
      return;
    }
    const text = await file.text();
    const err = importAction(text);
    setMessage(err ?? "Import successful. Data validated with Zod.");
  }

  return (
    <div className="stack gap-lg animate-in">
      <PageHeader
        title="Data & security"
        subtitle="Your portfolio lives in this browser. We validate every write."
      />
      <Panel>
        <h2 className="section-title">Privacy model</h2>
        <ul className="bullets">
          <li>Holdings, theses, goals, and check-ins stay in localStorage.</li>
          <li>Imports/exports are schema-validated before persistence.</li>
          <li>Market quotes go through a same-origin, rate-limited API.</li>
          <li>Optional FINNHUB_API_KEY stays on the server — never in the client bundle.</li>
          <li>Security headers harden clickjacking, MIME sniffing, and referrer leakage.</li>
        </ul>
      </Panel>
      <Panel className="stack gap-sm">
        <h2 className="section-title">Backup</h2>
        <div className="row gap-sm wrap">
          <Button onClick={download}>Export JSON</Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            Import JSON
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm("Reset all local AInvestPro data?")) {
                resetAction();
                setMessage("Workspace reset to demo starter portfolio.");
              }
            }}
          >
            Reset workspace
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => void onImport(e.target.files?.[0] ?? null)}
        />
        {message ? <p className="muted">{message}</p> : null}
      </Panel>
    </div>
  );
}
