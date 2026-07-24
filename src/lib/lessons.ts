export type Lesson = {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  body: string[];
};

export const LESSONS: Lesson[] = [
  {
    id: "process-over-prediction",
    title: "Process over prediction",
    summary: "Why a repeatable process beats trying to time the market.",
    minutes: 4,
    body: [
      "Markets are noisy in the short run. Nobody reliably predicts the next move, so anchoring decisions to forecasts invites whipsaw.",
      "A written process — what you buy, why, and what would prove you wrong — turns investing into a series of deliberate, reviewable decisions.",
      "AInvestPro nudges this habit: pair every position with a thesis and revisit it when your mood or the market shifts.",
    ],
  },
  {
    id: "diversification-basics",
    title: "Diversification basics",
    summary: "Spreading risk so no single holding can sink your plan.",
    minutes: 5,
    body: [
      "Concentration magnifies both gains and losses. A single bad quarter in one name can undo a year of progress.",
      "Owning several uncorrelated assets smooths the ride without necessarily lowering long-run returns.",
      "Use the Allocation screen to watch whether any single position quietly grows into an outsized share of your portfolio.",
    ],
  },
  {
    id: "cost-basis-and-pnl",
    title: "Cost basis & P/L",
    summary: "How average cost and realized vs. unrealized gains work.",
    minutes: 5,
    body: [
      "Your average cost is the share-weighted price you paid. Buying more at a different price moves that average.",
      "Unrealized P/L is paper gain on positions you still hold; realized P/L is locked in when you sell.",
      "AInvestPro tracks both: the ledger records realized gains on every sale so you can see the effect of your decisions.",
    ],
  },
  {
    id: "behavior-and-emotion",
    title: "Behavior & emotion",
    summary: "Recognizing FOMO and fear before they drive trades.",
    minutes: 4,
    body: [
      "Most costly mistakes are behavioral: chasing winners (FOMO) or panic-selling dips.",
      "Naming an emotion reduces its grip. The Check-in screen lets you log how you feel before acting.",
      "When a check-in flags FOMO or anxiety, treat it as a prompt to re-read your thesis rather than trade impulsively.",
    ],
  },
];

export function lessonProgressPercent(completedIds: string[]): number {
  if (LESSONS.length === 0) return 0;
  const completed = LESSONS.filter((lesson) => completedIds.includes(lesson.id)).length;
  return Math.round((completed / LESSONS.length) * 100);
}
