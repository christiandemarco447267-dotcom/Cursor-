import type { PortfolioSummary } from "./portfolio";
import type { AppState } from "./types";

export type InsightTone = "good" | "watch" | "info";

export type Insight = {
  id: string;
  title: string;
  body: string;
  tone: InsightTone;
};

/** Rule-based coaching derived directly from the portfolio and theses. */
export function buildInsights(state: AppState, summary: PortfolioSummary): Insight[] {
  const insights: Insight[] = [];
  const holdingsCount = state.holdings.length;

  // 1. Diversification
  if (holdingsCount === 0) {
    insights.push({
      id: "start",
      title: "Start your book",
      body: "You have cash to deploy. Buy your first position on the Trade screen and pair it with a thesis.",
      tone: "info",
    });
  } else {
    insights.push({
      id: "diversification",
      title: holdingsCount >= 4 ? "Well diversified" : "Broaden your book",
      body:
        holdingsCount >= 4
          ? `You hold ${holdingsCount} positions — a diversified base that reduces single-name risk.`
          : `You hold ${holdingsCount} position${holdingsCount === 1 ? "" : "s"}. Adding a few more uncorrelated names spreads your risk.`,
      tone: holdingsCount >= 4 ? "good" : "watch",
    });
  }

  // 2. Concentration
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

  // 3. Cash buffer
  if (summary.total > 0) {
    const cashPct = (summary.cash / summary.total) * 100;
    insights.push({
      id: "cash",
      title: "Cash on hand",
      body:
        cashPct < 2
          ? "You're nearly fully invested. Keeping a little cash gives you room to act on opportunities without forced selling."
          : `Cash is ${cashPct.toFixed(0)}% of your portfolio — dry powder for future buys.`,
      tone: cashPct < 2 ? "watch" : "good",
    });
  }

  // 4. Thesis coverage
  const unlinked = state.holdings.filter((h) => !h.thesisId);
  if (holdingsCount > 0) {
    insights.push({
      id: "thesis-coverage",
      title: "Thesis coverage",
      body:
        unlinked.length === 0
          ? "Every holding is backed by a thesis. That's the habit that separates investing from gambling."
          : `${unlinked.length} holding${unlinked.length === 1 ? "" : "s"} (${unlinked
              .map((h) => h.symbol)
              .slice(0, 4)
              .join(", ")}) lack a linked thesis. Write one so future-you knows why you bought.`,
      tone: unlinked.length === 0 ? "good" : "watch",
    });
  }

  return insights;
}
