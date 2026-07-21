"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useAppState } from "@/hooks/use-app-state";
import { moodGuidance } from "@/lib/investor-type";
import { upsertTodayStreak } from "@/lib/streaks";
import { moodInputSchema, sanitizeText } from "@/lib/validation";
import type { MoodEntry } from "@/lib/types";

const moods: MoodEntry["mood"][] = [
  "calm",
  "confident",
  "neutral",
  "anxious",
  "fomo",
];

export default function MoodPage() {
  const router = useRouter();
  const { update } = useAppState();
  const [selected, setSelected] = useState<MoodEntry["mood"]>("neutral");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const parsed = moodInputSchema.safeParse({
      mood: selected,
      note: sanitizeText(String(form.get("note") ?? "")) || undefined,
    });
    if (!parsed.success) {
      setError("Unable to save check-in.");
      return;
    }

    const entry: MoodEntry = {
      id: `m-${crypto.randomUUID()}`,
      mood: parsed.data.mood,
      note: parsed.data.note,
      createdAt: new Date().toISOString(),
    };

    update((prev) => ({
      ...prev,
      moods: [entry, ...prev.moods].slice(0, 50),
      xp: prev.xp + 10,
      streaks: upsertTodayStreak(prev.streaks, { checkIn: true }),
    }));
    router.push("/insights");
  }

  return (
    <AppShell title="Behavioral check-in">
      <form
        onSubmit={onSubmit}
        className="animate-rise space-y-4 rounded-2xl border border-line bg-surface p-4"
      >
        <h1 className="font-[family-name:var(--font-newsreader)] text-2xl">
          How are you feeling?
        </h1>
        <p className="text-sm text-muted">{moodGuidance(selected)}</p>
        <div className="grid grid-cols-2 gap-2">
          {moods.map((mood) => (
            <button
              key={mood}
              type="button"
              onClick={() => setSelected(mood)}
              className={`rounded-xl border px-3 py-3 text-sm font-medium capitalize ${
                selected === mood
                  ? "border-teal bg-teal/10 text-teal-deep"
                  : "border-line bg-paper text-ink"
              }`}
            >
              {mood}
            </button>
          ))}
        </div>
        <label className="block text-sm">
          <span className="text-muted">Optional note</span>
          <textarea
            name="note"
            maxLength={280}
            rows={3}
            className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 outline-none focus:border-teal"
            placeholder="What might influence your next decision?"
          />
        </label>
        {error ? <p className="text-sm text-loss">{error}</p> : null}
        <button
          type="submit"
          className="w-full rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-deep"
        >
          Save check-in
        </button>
      </form>
    </AppShell>
  );
}
