"use client";

import { useState } from "react";
import { useApp } from "@/lib/app-context";
import type { AppState } from "@/lib/types";
import { Button, Field, PageHeader, Panel, Textarea } from "@/components/ui";

const MOODS: { id: AppState["checkIns"][number]["mood"]; label: string }[] = [
  { id: "calm", label: "Calm" },
  { id: "confident", label: "Confident" },
  { id: "anxious", label: "Anxious" },
  { id: "fomo", label: "FOMO" },
  { id: "uncertain", label: "Uncertain" },
];

export function CheckInView() {
  const { state, addCheckInAction } = useApp();
  const [mood, setMood] = useState<AppState["checkIns"][number]["mood"]>("calm");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    addCheckInAction({ mood, note: note.trim().slice(0, 500) });
    setNote("");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="stack gap-lg animate-in">
      <PageHeader
        title="How are you feeling?"
        subtitle="Name the emotion before you move money — even paper money."
      />
      <Panel>
        <form className="form-grid" onSubmit={onSubmit}>
          <div className="mood-grid">
            {MOODS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={mood === m.id ? "mood active" : "mood"}
                onClick={() => setMood(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
          <Field label="Optional note">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="What would future-you want to remember?"
            />
          </Field>
          <Button type="submit">Save check-in</Button>
          {saved ? <p className="c-gain">Saved. Streak updated if this is your first today.</p> : null}
        </form>
      </Panel>
      <Panel>
        <h2 className="section-title">Recent check-ins</h2>
        {state.checkIns.length === 0 ? (
          <p className="muted">No check-ins yet.</p>
        ) : (
          <ul className="stack gap-sm">
            {state.checkIns.slice(0, 8).map((c) => (
              <li key={c.id} className="row between">
                <span>
                  <strong className="capitalize">{c.mood}</strong>
                  {c.note ? <span className="muted"> — {c.note}</span> : null}
                </span>
                <span className="muted small">
                  {new Date(c.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
