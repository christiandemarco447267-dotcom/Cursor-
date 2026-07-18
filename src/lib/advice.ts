import { moodGuidance } from "@/lib/investor-type";
import type { PortfolioSummary } from "@/lib/portfolio";
import type { AppState } from "@/lib/types";

export type Insight = {
  id: string;
  title: string;
  body: string;
  severity: "info" | "watch" | "action";
};

export function buildInsights(
  state: AppState,
  summary: PortfolioSummary,
): Insight[] {
  const insights: Insight[] = [];
  const cash = summary.allocation.find((a) => a.assetClass === "cash");
  const equityWeight =
    (summary.allocation.find((a) => a.assetClass === "equity")?.weight ?? 0) +
    (summary.allocation.find((a) => a.assetClass === "etf")?.weight ?? 0);

  if (state.theses.length === 0) {
    insights.push({
      id: "thesis-missing",
      title: "Document your first thesis",
      body: "Write why you own each position so future-you can judge the original idea, not the price.",
      severity: "action",
    });
  }

  if ((cash?.weight ?? 0) < 0.05) {
    insights.push({
      id: "cash-thin",
      title: "Cash buffer is thin",
      body: "Under 5% cash can force sales at the wrong time. Consider a small reserve for opportunities and expenses.",
      severity: "watch",
    });
  }

  if (equityWeight > 0.9) {
    insights.push({
      id: "concentrated-risk",
      title: "High market exposure",
      body: "Over 90% in equities/ETFs amplifies drawdowns. Revisit sizing against your goal timeline.",
      severity: "watch",
    });
  }

  if (summary.gainPct < -0.1) {
    insights.push({
      id: "drawdown",
      title: "Portfolio in a drawdown",
      body: "Double-check theses and invalidation levels before adding risk. Process beats panic.",
      severity: "action",
    });
  }

  const latestMood = [...state.moods].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )[0];
  insights.push({
    id: "mood",
    title: "Behavioral check",
    body: moodGuidance(latestMood?.mood),
    severity: "info",
  });

  const incompleteLearn = state.learn.filter((m) => !m.completed).length;
  if (incompleteLearn > 0) {
    insights.push({
      id: "learn",
      title: `${incompleteLearn} lesson${incompleteLearn === 1 ? "" : "s"} remaining`,
      body: "Short lessons compound into better decisions. Finish one module today.",
      severity: "info",
    });
  }

  return insights.slice(0, 5);
}
