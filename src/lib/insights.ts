import { processSignals } from "./gamification";
import type { PortfolioSummary } from "./portfolio";
import type { AppState } from "./types";
import { localDayKey } from "./market";

export type InsightTone = "good" | "watch" | "info";

export type Insight = {
  id: string;
  title: string;
  body: string;
  tone: InsightTone;
};

/**
 * Rule-based coaching. All cards derive from the same `processSignals` used for
 * the health grade, so advice can never contradict the grade the user is shown.
 */
export function buildInsights(state: AppState, summary: PortfolioSummary, today = localDayKey(new Date())): Insight[] {
  const signals = processSignals(state, today);
  const insights: Insight[] = [];

  // 1. Health / process summary
  insights.push({
    id: "process",
    title: signals.score >= 5 ? "Strong process" : "Build your process",
    body:
      signals.score >= 5
        ? "You're diversified, have theses on file, keep a cash buffer, and set goals. Keep reviewing rather than reacting."
        : "Your process score has room to grow. Add positions with written theses, keep a cash buffer, and set at least one goal.",
    tone: signals.score >= 5 ? "good" : "watch",
  });

  // 2. Concentration check
  const top = summary.holdings[0];
  if (top && summary.investments > 0) {
    const weight = (top.marketValue / summary.investments) * 100;
    insights.push({
      id: "concentration",
      title: "Concentration check",
      body:
        weight >= 40
          ? `${top.symbol} is ${weight.toFixed(0)}% of your invested value. Consider trimming or diversifying to reduce single-name risk.`
          : `Your largest position (${top.symbol}) is ${weight.toFixed(0)}% of invested value — a reasonably balanced book.`,
      tone: weight >= 40 ? "watch" : "good",
    });
  }

  // 3. Thesis coverage (uses thesisId links, kept consistent everywhere)
  const unlinked = state.holdings.filter((h) => !h.thesisId);
  insights.push({
    id: "thesis-coverage",
    title: "Thesis coverage",
    body:
      unlinked.length === 0 && state.holdings.length > 0
        ? "Every holding is backed by a thesis. That's exactly the habit that separates investing from gambling."
        : unlinked.length > 0
          ? `${unlinked.length} holding${unlinked.length === 1 ? "" : "s"} (${unlinked
              .map((h) => h.symbol)
              .slice(0, 4)
              .join(", ")}) lack a linked thesis. Write one so future-you knows why you bought.`
          : "Add a holding and pair it with a thesis to start building coverage.",
    tone: unlinked.length === 0 && state.holdings.length > 0 ? "good" : "watch",
  });

  // 4. Behavioral cue from latest check-in
  const latest = state.checkIns[0];
  if (latest && (latest.mood === "fomo" || latest.mood === "anxious")) {
    insights.push({
      id: "behavior",
      title: "Mind your emotions",
      body:
        latest.mood === "fomo"
          ? "Your last check-in flagged FOMO. Before chasing a move, re-read your thesis and stick to your plan."
          : "Your last check-in flagged anxiety. Volatility is normal — avoid panic-selling and revisit why you hold each position.",
      tone: "watch",
    });
  } else if (!signals.reflectedRecently) {
    insights.push({
      id: "reflect",
      title: "Time to reflect",
      body: "You haven't checked in this week. A quick mood log helps you notice emotional patterns before they drive trades.",
      tone: "info",
    });
  }

  return insights;
}
