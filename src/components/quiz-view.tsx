"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { INVESTOR_BLURBS, QUIZ_QUESTIONS, scoreQuiz, type InvestorTypeKey } from "@/lib/quiz";
import { useApp } from "@/lib/store";
import { Loading, Panel, PageHeader } from "./ui";

export function QuizView() {
  const { ready, state, actions } = useApp();
  const [answers, setAnswers] = useState<InvestorTypeKey[]>([]);
  const [showResult, setShowResult] = useState(false);

  if (!ready || !state) return <Loading />;

  const step = answers.length;
  const savedType = state.investor.type;

  const choose = (type: InvestorTypeKey) => {
    const next = [...answers, type];
    setAnswers(next);
    if (next.length === QUIZ_QUESTIONS.length) {
      const winner = scoreQuiz(next);
      actions.setInvestorType(winner);
      setShowResult(true);
    }
  };

  const restart = () => {
    setAnswers([]);
    setShowResult(false);
  };

  if (showResult || (savedType !== "unspecified" && step === 0)) {
    const type = showResult ? scoreQuiz(answers) : (savedType as InvestorTypeKey);
    const blurb = INVESTOR_BLURBS[type];
    return (
      <div className="stack gap-lg animate-in">
        <PageHeader title="Your investor type" />
        <Panel strong className="stack gap-md panel-pad-lg">
          <span className="eyebrow">You are</span>
          <h1 style={{ fontSize: "2.2rem" }}>{blurb.title}</h1>
          <p className="muted">{blurb.blurb}</p>
          <button className="btn" style={{ width: "fit-content" }} onClick={restart}>
            <RotateCcw size={15} /> Retake quiz
          </button>
        </Panel>
        <p className="disclaimer">
          This is a lightweight self-discovery quiz for reflection — not a regulated suitability or risk questionnaire.
        </p>
      </div>
    );
  }

  const question = QUIZ_QUESTIONS[step];

  return (
    <div className="stack gap-lg animate-in">
      <PageHeader title="Discover your type" subtitle={`Question ${step + 1} of ${QUIZ_QUESTIONS.length}`} />
      <Panel strong className="stack gap-md panel-pad-lg">
        <h2 style={{ fontSize: "1.4rem" }}>{question.prompt}</h2>
        <div className="stack gap-sm">
          {question.options.map((option) => (
            <button key={option.label} className="btn btn-block" style={{ justifyContent: "flex-start" }} onClick={() => choose(option.type)}>
              {option.label}
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
