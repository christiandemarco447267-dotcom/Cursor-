import type { INVESTOR_TYPES } from "./types";

export type InvestorTypeKey = (typeof INVESTOR_TYPES)[number];

export type QuizOption = {
  label: string;
  type: InvestorTypeKey;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: QuizOption[];
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    prompt: "A holding drops 15% in a week. What's your instinct?",
    options: [
      { label: "Re-read my thesis, then decide calmly", type: "strategist" },
      { label: "Hold — I invest for the long haul", type: "guardian" },
      { label: "Look for a chance to buy more", type: "explorer" },
      { label: "Add steadily to my plan regardless", type: "builder" },
    ],
  },
  {
    id: "q2",
    prompt: "How do you prefer to grow your portfolio?",
    options: [
      { label: "Automatic, consistent contributions", type: "builder" },
      { label: "Protect capital, avoid big drawdowns", type: "guardian" },
      { label: "Explore new themes and opportunities", type: "explorer" },
      { label: "Research-driven, high-conviction bets", type: "strategist" },
    ],
  },
  {
    id: "q3",
    prompt: "What best describes your ideal investing day?",
    options: [
      { label: "Set it and forget it", type: "builder" },
      { label: "Checking that everything is safe", type: "guardian" },
      { label: "Discovering an exciting new company", type: "explorer" },
      { label: "Digging into an earnings report", type: "strategist" },
    ],
  },
];

export const INVESTOR_BLURBS: Record<InvestorTypeKey, { title: string; blurb: string }> = {
  builder: {
    title: "The Builder",
    blurb: "You favor steady, automatic progress. Consistency and dollar-cost averaging are your superpowers.",
  },
  guardian: {
    title: "The Guardian",
    blurb: "You prioritize protecting capital. Diversification and risk management keep you comfortable.",
  },
  explorer: {
    title: "The Explorer",
    blurb: "You're energized by new ideas. Channel that curiosity with a thesis for every exploration.",
  },
  strategist: {
    title: "The Strategist",
    blurb: "You make research-driven, high-conviction decisions. Your written theses are your edge.",
  },
};

/** Plurality vote over the chosen option types; ties broken by question order of first appearance. */
export function scoreQuiz(answers: InvestorTypeKey[]): InvestorTypeKey {
  const counts = new Map<InvestorTypeKey, number>();
  const firstSeen = new Map<InvestorTypeKey, number>();
  answers.forEach((type, index) => {
    counts.set(type, (counts.get(type) ?? 0) + 1);
    if (!firstSeen.has(type)) firstSeen.set(type, index);
  });

  let winner: InvestorTypeKey = answers[0] ?? "builder";
  let best = -1;
  for (const [type, count] of counts) {
    if (count > best || (count === best && (firstSeen.get(type) ?? 0) < (firstSeen.get(winner) ?? 0))) {
      winner = type;
      best = count;
    }
  }
  return winner;
}
