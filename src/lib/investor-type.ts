import type { InvestorType, MoodEntry } from "@/lib/types";

export const INVESTOR_TYPES: Record<
  Exclude<InvestorType, "unspecified">,
  { label: string; summary: string; focus: string }
> = {
  builder: {
    label: "Builder",
    summary: "Long-horizon compounding with steady contributions.",
    focus: "Automate buys, ignore short noise, revisit thesis quarterly.",
  },
  guardian: {
    label: "Guardian",
    summary: "Capital preservation and controlled drawdowns come first.",
    focus: "Keep cash buffers, size risk tightly, prefer quality cash flows.",
  },
  explorer: {
    label: "Explorer",
    summary: "Curious about new ideas but needs a decision framework.",
    focus: "Cap speculative sleeves; write a thesis before every buy.",
  },
  tactician: {
    label: "Tactician",
    summary: "Active around catalysts with disciplined exits.",
    focus: "Define invalidation levels and avoid revenge trading.",
  },
};

const TYPE_ORDER: Array<Exclude<InvestorType, "unspecified">> = [
  "builder",
  "guardian",
  "explorer",
  "tactician",
];

/** Lightweight quiz scoring — intentional, transparent, no black-box model. */
export function scoreInvestorType(answers: number[]): InvestorType {
  if (answers.length < 4) return "unspecified";
  const totals = [0, 0, 0, 0];
  answers.forEach((answer, index) => {
    const clamped = Math.max(0, Math.min(3, Math.round(answer)));
    totals[clamped] += 1 + (index % 2 === 0 ? 0.25 : 0);
  });
  const best = totals.indexOf(Math.max(...totals));
  return TYPE_ORDER[best] ?? "unspecified";
}

export function latestMood(moods: MoodEntry[]): MoodEntry | null {
  if (moods.length === 0) return null;
  return [...moods].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export function moodGuidance(
  mood: MoodEntry["mood"] | undefined,
): string {
  switch (mood) {
    case "anxious":
      return "Pause new risk. Review your thesis and cash buffer before acting.";
    case "fomo":
      return "Write the thesis first. If you cannot state the edge, skip the trade.";
    case "confident":
      return "Confidence is useful — confirm sizing still matches your plan.";
    case "calm":
      return "Good state for scheduled reviews and small, planned contributions.";
    default:
      return "A quick check-in keeps decisions grounded in process, not impulse.";
  }
}
