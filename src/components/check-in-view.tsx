"use client";

import { useState } from "react";
import { formatRelativeDay } from "@/lib/format";
import { MOODS } from "@/lib/types";
import { useApp } from "@/lib/store";
import { EmptyState, Loading, Panel, PageHeader } from "./ui";

const MOOD_META: Record<(typeof MOODS)[number], { emoji: string; label: string }> = {
  calm: { emoji: "😌", label: "Calm" },
  confident: { emoji: "💪", label: "Confident" },
  anxious: { emoji: "😟", label: "Anxious" },
  fomo: { emoji: "🤑", label: "FOMO" },
  uncertain: { emoji: "🤔", label: "Uncertain" },
};

export function CheckInView() {
  const { ready, state, actions } = useApp();
  const [mood, setMood] = useState<(typeof MOODS)[number] | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  if (!ready || !state) return <Loading />;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!mood) return;
    actions.addCheckIn({ mood, note });
    setMood(null);
    setNote("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="stack gap-lg animate-in">
      <PageHeader title="Daily check-in" subtitle="Naming an emotion loosens its grip. Log how you feel before you act." />

      <Panel strong className="stack gap-md">
        <form className="stack gap-md" onSubmit={submit}>
          <div className="mood-grid">
            {MOODS.map((m) => (
              <button
                type="button"
                key={m}
                className={`mood-chip ${mood === m ? "selected" : ""}`}
                onClick={() => setMood(m)}
                aria-pressed={mood === m}
              >
                <span className="mood-emoji">{MOOD_META[m].emoji}</span>
                {MOOD_META[m].label}
              </button>
            ))}
          </div>
          <div className="field">
            <label htmlFor="checkin-note">Note (optional)</label>
            <textarea
              id="checkin-note"
              className="textarea"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder="What's on your mind about the market or your portfolio?"
            />
          </div>
          {saved ? <span className="form-ok">Check-in saved.</span> : null}
          <button type="submit" className="btn btn-primary" style={{ width: "fit-content" }} disabled={!mood}>
            Save check-in
          </button>
        </form>
      </Panel>

      <Panel className="stack gap-sm">
        <strong>Recent check-ins</strong>
        {state.checkIns.length === 0 ? (
          <EmptyState title="No check-ins yet" />
        ) : (
          <div className="list">
            {state.checkIns.slice(0, 8).map((checkIn) => (
              <div key={checkIn.id} className="list-row">
                <span className="mood-emoji" style={{ margin: 0 }}>
                  {MOOD_META[checkIn.mood].emoji}
                </span>
                <div className="grow stack" style={{ gap: 2 }}>
                  <strong>{MOOD_META[checkIn.mood].label}</strong>
                  {checkIn.note ? <span className="small muted">{checkIn.note}</span> : null}
                </div>
                <span className="small dim">{formatRelativeDay(checkIn.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
