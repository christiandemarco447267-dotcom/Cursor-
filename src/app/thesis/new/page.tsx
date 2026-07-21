"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useAppState } from "@/hooks/use-app-state";
import { upsertTodayStreak } from "@/lib/streaks";
import { sanitizeText, thesisInputSchema } from "@/lib/validation";
import type { Thesis } from "@/lib/types";

export default function NewThesisPage() {
  const router = useRouter();
  const { update } = useAppState();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const parsed = thesisInputSchema.safeParse({
      symbol: sanitizeText(String(form.get("symbol") ?? "")),
      title: sanitizeText(String(form.get("title") ?? "")),
      thesis: sanitizeText(String(form.get("thesis") ?? "")),
      conviction: Number(form.get("conviction")),
    });
    if (!parsed.success) {
      setError("Add a valid symbol, title, and a thesis of at least 20 characters.");
      return;
    }

    const now = new Date().toISOString();
    const thesis: Thesis = {
      id: `t-${crypto.randomUUID()}`,
      symbol: parsed.data.symbol,
      title: parsed.data.title,
      thesis: parsed.data.thesis,
      conviction: parsed.data.conviction,
      createdAt: now,
      updatedAt: now,
    };

    update((prev) => ({
      ...prev,
      theses: [thesis, ...prev.theses],
      xp: prev.xp + 25,
      streaks: upsertTodayStreak(prev.streaks, { thesisOrLearn: true }),
    }));
    router.push("/thesis");
  }

  return (
    <AppShell title="Write with conviction">
      <form
        onSubmit={onSubmit}
        className="animate-rise space-y-3 rounded-2xl border border-line bg-surface p-4"
      >
        <label className="block text-sm">
          <span className="text-muted">Symbol</span>
          <input
            name="symbol"
            required
            maxLength={12}
            className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 uppercase outline-none focus:border-teal"
            placeholder="AAPL"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Title</span>
          <input
            name="title"
            required
            maxLength={80}
            className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 outline-none focus:border-teal"
            placeholder="Durable cash flows + buybacks"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Thesis</span>
          <textarea
            name="thesis"
            required
            minLength={20}
            maxLength={2000}
            rows={7}
            className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 outline-none focus:border-teal"
            placeholder="What is the edge, the risks, and what would prove you wrong?"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Conviction (1–5)</span>
          <input
            name="conviction"
            type="number"
            min={1}
            max={5}
            defaultValue={3}
            required
            className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 outline-none focus:border-teal"
          />
        </label>
        {error ? <p className="text-sm text-loss">{error}</p> : null}
        <button
          type="submit"
          className="w-full rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-deep"
        >
          Save thesis
        </button>
      </form>
    </AppShell>
  );
}
