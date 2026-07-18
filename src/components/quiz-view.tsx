"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import type { AppState } from "@/lib/types";
import { Button, PageHeader, Panel } from "@/components/ui";

type Answer = "builder" | "guardian" | "explorer" | "strategist";

const QUESTIONS: {
  prompt: string;
  options: { label: string; value: Answer }[];
}[] = [
  {
    prompt: "When markets drop 15%, your first instinct is to…",
    options: [
      { label: "Buy more of what I already believe in", value: "builder" },
      { label: "Reduce risk and protect capital", value: "guardian" },
      { label: "Look for new opportunities", value: "explorer" },
      { label: "Rebalance to target weights", value: "strategist" },
    ],
  },
  {
    prompt: "Your research style is closest to…",
    options: [
      { label: "Long-term ownership stories", value: "builder" },
      { label: "Downside and worst-case first", value: "guardian" },
      { label: "Themes, trends, and discovery", value: "explorer" },
      { label: "Checklists, models, and rules", value: "strategist" },
    ],
  },
  {
    prompt: "Success for you looks like…",
    options: [
      { label: "Compounding patiently for years", value: "builder" },
      { label: "Sleeping well through volatility", value: "guardian" },
      { label: "Learning by exploring ideas", value: "explorer" },
      { label: "Staying disciplined to a plan", value: "strategist" },
    ],
  },
];

const LABELS: Record<Exclude<AppState["investor"]["type"], "unspecified">, string> = {
  builder: "Builder",
  guardian: "Guardian",
  explorer: "Explorer",
  strategist: "Strategist",
};

const BLURBS: Record<Exclude<AppState["investor"]["type"], "unspecified">, string> = {
  builder:
    "You favor durable ownership and patience. Write theses that span years, not headlines.",
  guardian:
    "You prioritize resilience. Keep cash buffers, define max position sizes, and stress-test goals.",
  explorer:
    "You learn by scanning the frontier. Cap speculative sleeves so curiosity does not dominate risk.",
  strategist:
    "You thrive on process. Automate rebalancing rules and review theses on a calendar.",
};

export function QuizView() {
  const { state, setInvestorTypeAction } = useApp();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);

  const result = useMemo(() => {
    if (answers.length < QUESTIONS.length) return null;
    const tallies: Record<Answer, number> = {
      builder: 0,
      guardian: 0,
      explorer: 0,
      strategist: 0,
    };
    for (const a of answers) tallies[a] += 1;
    return (Object.entries(tallies).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      "strategist") as Answer;
  }, [answers]);

  function choose(value: Answer) {
    const next = [...answers.slice(0, step), value];
    setAnswers(next);
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      const tallies: Record<Answer, number> = {
        builder: 0,
        guardian: 0,
        explorer: 0,
        strategist: 0,
      };
      for (const a of next) tallies[a] += 1;
      const winner = (Object.entries(tallies).sort((a, b) => b[1] - a[1])[0]?.[0] ??
        "strategist") as Answer;
      setInvestorTypeAction(winner);
    }
  }

  const type =
    result ??
    (state.investor.type !== "unspecified" ? state.investor.type : null);

  return (
    <div className="stack gap-lg animate-in">
      <PageHeader
        title="Discover your type"
        subtitle="A lightweight preference map — not a risk questionnaire for regulated advice."
      />
      {type && answers.length >= QUESTIONS.length ? (
        <Panel>
          <p className="eyebrow">Your investor type</p>
          <h2 className="mega-number" style={{ fontSize: "2.4rem" }}>
            {LABELS[type]}
          </h2>
          <p className="body">{BLURBS[type]}</p>
          <Button
            variant="secondary"
            onClick={() => {
              setAnswers([]);
              setStep(0);
            }}
          >
            Retake
          </Button>
        </Panel>
      ) : (
        <Panel>
          <p className="muted">
            Question {step + 1} of {QUESTIONS.length}
          </p>
          <h2 className="section-title">{QUESTIONS[step].prompt}</h2>
          <div className="stack gap-sm">
            {QUESTIONS[step].options.map((opt) => (
              <button
                key={opt.label}
                type="button"
                className="choice"
                onClick={() => choose(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Panel>
      )}
      {state.investor.type !== "unspecified" && answers.length < QUESTIONS.length ? (
        <p className="muted">
          Previously saved type: <strong>{LABELS[state.investor.type]}</strong>
        </p>
      ) : null}
    </div>
  );
}
