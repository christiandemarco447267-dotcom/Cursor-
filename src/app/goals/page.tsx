"use client";

import { useState, type FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { useAppState } from "@/hooks/use-app-state";
import { formatMoney } from "@/lib/format";
import { summarizePortfolio } from "@/lib/portfolio";
import { upsertTodayStreak } from "@/lib/streaks";
import { goalInputSchema, sanitizeText } from "@/lib/validation";
import type { Goal } from "@/lib/types";

export default function GoalsPage() {
  const { state, update } = useAppState();
  const summary = summarizePortfolio(state.holdings);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const parsed = goalInputSchema.safeParse({
      title: sanitizeText(String(form.get("title") ?? "")),
      targetAmount: Number(form.get("targetAmount")),
      category: String(form.get("category") ?? "other"),
      deadline: String(form.get("deadline") ?? ""),
    });
    if (!parsed.success) {
      setError("Check the goal title and target amount.");
      return;
    }

    const goal: Goal = {
      id: `g-${crypto.randomUUID()}`,
      title: parsed.data.title,
      targetAmount: parsed.data.targetAmount,
      currentAmount: summary.marketValue,
      category: parsed.data.category,
      deadline: parsed.data.deadline || undefined,
      createdAt: new Date().toISOString(),
    };

    update((prev) => ({
      ...prev,
      goals: [goal, ...prev.goals],
      xp: prev.xp + 20,
      streaks: upsertTodayStreak(prev.streaks, { goalReview: true }),
    }));
    event.currentTarget.reset();
  }

  return (
    <AppShell title="Goals that guide allocation">
      <form
        onSubmit={onSubmit}
        className="animate-rise space-y-3 rounded-2xl border border-line bg-surface p-4"
      >
        <h1 className="font-[family-name:var(--font-newsreader)] text-2xl">
          Set a goal
        </h1>
        <label className="block text-sm">
          <span className="text-muted">Title</span>
          <input
            name="title"
            required
            maxLength={80}
            className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 outline-none focus:border-teal"
            placeholder="Emergency fund, house down payment…"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Target amount (USD)</span>
          <input
            name="targetAmount"
            type="number"
            min={1}
            step="0.01"
            required
            className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 outline-none focus:border-teal"
            placeholder="25000"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-muted">Category</span>
            <select
              name="category"
              className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 outline-none focus:border-teal"
              defaultValue="other"
            >
              <option value="retirement">Retirement</option>
              <option value="home">Home</option>
              <option value="vacation">Vacation</option>
              <option value="education">Education</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted">Deadline</span>
            <input
              name="deadline"
              type="date"
              className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 outline-none focus:border-teal"
            />
          </label>
        </div>
        {error ? <p className="text-sm text-loss">{error}</p> : null}
        <button
          type="submit"
          className="w-full rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-deep"
        >
          Save goal
        </button>
      </form>

      <ul className="animate-rise-delay-1 mt-4 space-y-3">
        {state.goals.map((goal) => {
          const current = Math.max(goal.currentAmount, summary.marketValue);
          const pct = Math.min(100, Math.round((current / goal.targetAmount) * 100));
          return (
            <li key={goal.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{goal.title}</h2>
                  <p className="mt-1 text-sm text-muted capitalize">{goal.category}</p>
                </div>
                <p className="text-sm font-medium">{pct}%</p>
              </div>
              <p className="mt-2 text-sm text-muted">
                {formatMoney(current)} of {formatMoney(goal.targetAmount)}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-lg bg-paper">
                <div
                  className="h-full rounded-lg bg-teal"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
