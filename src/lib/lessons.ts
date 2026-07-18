export type Lesson = {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  body: string[];
};

export const LESSONS: Lesson[] = [
  {
    id: "risk-basics",
    title: "Risk is the price of return",
    summary: "Understand volatility before chasing performance.",
    minutes: 4,
    body: [
      "Every investment tradeoff is a risk/return decision. Higher expected returns usually require accepting more uncertainty.",
      "Diversification does not eliminate risk, but it reduces the chance that one bad outcome defines your entire portfolio.",
      "Before buying, write down what would make you sell — and what would not.",
    ],
  },
  {
    id: "costs-compound",
    title: "Costs compound against you",
    summary: "Fees and taxes quietly erode long-term results.",
    minutes: 3,
    body: [
      "A 1% annual fee can remove a meaningful share of wealth over decades.",
      "Prefer transparent, low-cost funds when you do not have a specific edge.",
      "Turnover creates taxes in taxable accounts — activity is not the same as progress.",
    ],
  },
  {
    id: "thesis-discipline",
    title: "Write a thesis before you buy",
    summary: "Document why you own something while you are calm.",
    minutes: 5,
    body: [
      "A thesis captures the economic reason for ownership, not a price target alone.",
      "Include risks that would invalidate the idea. If those show up, reassess quickly.",
      "Revisit theses on a schedule — not only after a drawdown.",
    ],
  },
  {
    id: "behavior-gap",
    title: "The behavior gap",
    summary: "Investor returns often lag investment returns.",
    minutes: 4,
    body: [
      "Buying after rallies and selling after declines is a common wealth destroyer.",
      "Rules, checklists, and position sizing reduce emotional decision-making.",
      "Mood check-ins help you notice FOMO and fear before they move capital.",
    ],
  },
];

export function lessonProgressPercent(completedIds: Set<string>): number {
  if (LESSONS.length === 0) return 0;
  const done = LESSONS.filter((l) => completedIds.has(l.id)).length;
  return Math.round((done / LESSONS.length) * 100);
}
