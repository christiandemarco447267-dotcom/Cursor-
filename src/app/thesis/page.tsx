"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { useAppState } from "@/hooks/use-app-state";

export default function ThesisListPage() {
  const { state } = useAppState();

  return (
    <AppShell
      title="Investment theses"
      action={
        <Link
          href="/thesis/new"
          className="rounded-xl bg-teal px-3 py-2 text-xs font-semibold text-white"
        >
          New thesis
        </Link>
      }
    >
      {state.theses.length === 0 ? (
        <div className="animate-rise rounded-2xl border border-line bg-surface p-6 text-center">
          <h1 className="font-[family-name:var(--font-newsreader)] text-2xl">
            No theses yet
          </h1>
          <p className="mt-2 text-sm text-muted">
            Capture why you bought before price action rewrites the story.
          </p>
          <Link
            href="/thesis/new"
            className="mt-4 inline-flex rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white"
          >
            Write your first thesis
          </Link>
        </div>
      ) : (
        <ul className="animate-rise space-y-3">
          {state.theses.map((thesis) => (
            <li
              key={thesis.id}
              className="rounded-2xl border border-line bg-surface p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-teal-deep">
                  {thesis.symbol}
                </p>
                <p className="text-xs text-muted">
                  Conviction {thesis.conviction}/5
                </p>
              </div>
              <h2 className="mt-1 font-semibold text-ink">{thesis.title}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted">
                {thesis.thesis}
              </p>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
