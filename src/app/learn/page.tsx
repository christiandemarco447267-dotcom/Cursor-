"use client";

import { AppShell } from "@/components/app-shell";
import { useAppState } from "@/hooks/use-app-state";
import { upsertTodayStreak } from "@/lib/streaks";

export default function LearnPage() {
  const { state, update } = useAppState();
  const completed = state.learn.filter((m) => m.completed).length;
  const pct = state.learn.length
    ? Math.round((completed / state.learn.length) * 100)
    : 0;

  function toggle(id: string) {
    update((prev) => {
      const learn = prev.learn.map((module) =>
        module.id === id ? { ...module, completed: !module.completed } : module,
      );
      const justCompleted = learn.find((m) => m.id === id)?.completed;
      return {
        ...prev,
        learn,
        xp: prev.xp + (justCompleted ? 15 : 0),
        streaks: upsertTodayStreak(prev.streaks, { thesisOrLearn: true }),
      };
    });
  }

  return (
    <AppShell title="Short lessons that stick">
      <section className="animate-rise mb-4 rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-ink">Curriculum progress</span>
          <span className="text-muted">
            {completed}/{state.learn.length} · {pct}%
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-lg bg-paper">
          <div
            className="animate-fill-bar h-full rounded-lg bg-teal"
            style={{ width: `${pct}%` }}
          />
        </div>
      </section>

      <ul className="animate-rise-delay-1 space-y-3">
        {state.learn.map((module) => (
          <li
            key={module.id}
            className="rounded-2xl border border-line bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-ink">{module.title}</h2>
                <p className="mt-1 text-sm text-muted">{module.summary}</p>
                <p className="mt-2 text-xs text-muted">{module.minutes} min</p>
              </div>
              <button
                type="button"
                onClick={() => toggle(module.id)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                  module.completed
                    ? "bg-gain/15 text-gain"
                    : "bg-teal text-white"
                }`}
              >
                {module.completed ? "Done" : "Complete"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
