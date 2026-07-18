"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useAppState } from "@/hooks/use-app-state";
import { INVESTOR_TYPES, scoreInvestorType } from "@/lib/investor-type";
import { investorQuizSchema } from "@/lib/validation";

const questions = [
  {
    prompt: "When markets drop 15%, you usually…",
    options: [
      "Keep buying on schedule",
      "Raise cash and wait",
      "Hunt for new opportunities",
      "Rebalance tactically around levels",
    ],
  },
  {
    prompt: "Your edge feels closest to…",
    options: [
      "Time in the market",
      "Avoiding permanent loss",
      "Finding emerging themes early",
      "Trading catalysts with rules",
    ],
  },
  {
    prompt: "Portfolio reviews should be…",
    options: [
      "Quarterly and boring",
      "Focused on downside first",
      "Idea-rich and exploratory",
      "Frequent with clear exits",
    ],
  },
  {
    prompt: "A new tip from a friend makes you…",
    options: [
      "Ignore unless it fits the plan",
      "Stress-test the downside",
      "Research with curiosity",
      "Define a trade plan before acting",
    ],
  },
];

export default function InvestorTypePage() {
  const router = useRouter();
  const { state, update } = useAppState();
  const [answers, setAnswers] = useState<number[]>([0, 0, 0, 0]);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    const parsed = investorQuizSchema.safeParse({ answers });
    if (!parsed.success) {
      setError("Complete all questions.");
      return;
    }
    const investorType = scoreInvestorType(parsed.data.answers);
    update((prev) => ({
      ...prev,
      investorType,
      xp: prev.xp + 30,
    }));
    router.push("/insights");
  }

  const current =
    state.investorType !== "unspecified"
      ? INVESTOR_TYPES[state.investorType]
      : null;

  return (
    <AppShell title="Discover your investing style">
      {current ? (
        <section className="animate-rise mb-4 rounded-2xl border border-line bg-ink p-4 text-white">
          <p className="text-sm text-white/70">Current type</p>
          <h2 className="mt-1 text-2xl font-[family-name:var(--font-newsreader)]">
            {current.label}
          </h2>
          <p className="mt-2 text-sm text-white/75">{current.focus}</p>
        </section>
      ) : null}

      <section className="animate-rise-delay-1 space-y-4">
        {questions.map((question, qIndex) => (
          <div
            key={question.prompt}
            className="rounded-2xl border border-line bg-surface p-4"
          >
            <h2 className="font-medium text-ink">
              {qIndex + 1}. {question.prompt}
            </h2>
            <div className="mt-3 space-y-2">
              {question.options.map((option, oIndex) => (
                <label
                  key={option}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                    answers[qIndex] === oIndex
                      ? "border-teal bg-teal/10"
                      : "border-line bg-paper"
                  }`}
                >
                  <input
                    type="radio"
                    className="accent-teal"
                    name={`q-${qIndex}`}
                    checked={answers[qIndex] === oIndex}
                    onChange={() =>
                      setAnswers((prev) => {
                        const next = [...prev];
                        next[qIndex] = oIndex;
                        return next;
                      })
                    }
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>
        ))}
        {error ? <p className="text-sm text-loss">{error}</p> : null}
        <button
          type="button"
          onClick={submit}
          className="w-full rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-deep"
        >
          Save investor type
        </button>
      </section>
    </AppShell>
  );
}
