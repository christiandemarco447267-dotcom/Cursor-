import type { FinancialProfile } from "./analytics";
import { computeWellnessScore } from "./analytics";

export type AdvicePriority = "high" | "medium" | "low";
export type AdviceCategory =
  | "debt"
  | "savings"
  | "spending"
  | "cashflow"
  | "protection";

export interface AdviceItem {
  id: string;
  title: string;
  summary: string;
  detail: string;
  priority: AdvicePriority;
  category: AdviceCategory;
  impactLabel: string;
  action: string;
}

export interface AdviceReport {
  wellnessScore: number;
  wellnessLabel: string;
  headline: string;
  circumstances: string;
  advice: AdviceItem[];
  generatedAt: string;
}

function money(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function generateAdvice(profile: FinancialProfile): AdviceReport {
  const { score, label } = computeWellnessScore(profile);
  const advice: AdviceItem[] = [];

  if (profile.highAprDebt.length > 0) {
    const debt = profile.highAprDebt[0];
    const monthlyInterest = (debt.balance * (debt.apr / 100)) / 12;
    advice.push({
      id: "high-apr-debt",
      title: "Prioritize high-interest credit balances",
      summary: `Your ${debt.name} carries ${money(debt.balance)} at ${debt.apr}% APR.`,
      detail: `At this rate you are accruing roughly ${money(monthlyInterest)} in interest each month. Avalanche payments toward this balance before extra payments on lower-rate loans.`,
      priority: "high",
      category: "debt",
      impactLabel: `~${money(monthlyInterest)}/mo interest`,
      action: `Route an extra ${money(Math.min(200, profile.discretionaryMonthlySpend * 0.25))} from discretionary spending to this card this month.`,
    });
  }

  if (profile.emergencyFundMonths < 3) {
    const gapMonths = Math.max(0, 3 - profile.emergencyFundMonths);
    const targetAdd = profile.essentialMonthlySpend * gapMonths;
    advice.push({
      id: "emergency-fund",
      title: "Build a three-month emergency cushion",
      summary: `Liquid savings cover about ${profile.emergencyFundMonths.toFixed(1)} months of essentials.`,
      detail: `Your essential spend is roughly ${money(profile.essentialMonthlySpend)}/month. Aim for ${money(profile.essentialMonthlySpend * 3)} in accessible savings so a job gap or surprise bill does not force high-interest borrowing.`,
      priority: profile.emergencyFundMonths < 1 ? "high" : "medium",
      category: "protection",
      impactLabel: `${money(targetAdd)} to reach 3 months`,
      action: `Automate a ${money(Math.max(100, Math.round(profile.monthly.income * 0.05)))} transfer to savings on each payday.`,
    });
  }

  if (profile.savingsRate < 0.15) {
    advice.push({
      id: "savings-rate",
      title: "Raise your savings rate toward 15%",
      summary: `You are currently saving about ${pct(profile.savingsRate)} of take-home income.`,
      detail: `Households that consistently save 15%+ of income recover faster from shocks and fund longer-term goals without relying on credit. Your income averages ${money(profile.monthly.income)}/month.`,
      priority: profile.savingsRate < 0.05 ? "high" : "medium",
      category: "savings",
      impactLabel: `${pct(0.15 - profile.savingsRate)} gap to target`,
      action: `Increase automatic savings by ${money(Math.round(profile.monthly.income * Math.max(0.02, 0.15 - profile.savingsRate)))} next payday.`,
    });
  }

  if (profile.subscriptionMonthlyTotal >= 40) {
    const top = profile.subscriptions.slice(0, 3).map((s) => s.merchant).join(", ");
    advice.push({
      id: "subscription-audit",
      title: "Trim subscription creep",
      summary: `Recurring subscriptions total about ${money(profile.subscriptionMonthlyTotal)}/month.`,
      detail: `Detected services include ${top}. Canceling one unused membership often frees cash for debt payoff or emergency savings without changing daily habits.`,
      priority: profile.subscriptionMonthlyTotal > 100 ? "medium" : "low",
      category: "spending",
      impactLabel: `${money(profile.subscriptionMonthlyTotal)}/mo recurring`,
      action: "Review the last 90 days of subscription charges and cancel anything unused in the past month.",
    });
  }

  if (profile.diningOutMonthly > 150) {
    const trim = Math.round(profile.diningOutMonthly * 0.25);
    advice.push({
      id: "dining-out",
      title: "Rebalance dining and delivery spend",
      summary: `Restaurants, coffee, and delivery average ${money(profile.diningOutMonthly)}/month.`,
      detail: `A modest 25% reduction frees about ${money(trim)} monthly—enough to accelerate credit-card payoff or boost your emergency fund without cutting groceries.`,
      priority: "medium",
      category: "spending",
      impactLabel: `${money(trim)}/mo potential`,
      action: "Set a weekly dining budget and batch two delivery nights into home-cooked meals.",
    });
  }

  if (profile.monthly.net < 0) {
    advice.push({
      id: "cashflow-gap",
      title: "Close the monthly cash-flow gap",
      summary: `Expenses and transfers currently outpace income by ${money(Math.abs(profile.monthly.net))}/month.`,
      detail: "Negative cash flow is the strongest predictor of revolving debt growth. Start with the largest discretionary categories before touching essentials.",
      priority: "high",
      category: "cashflow",
      impactLabel: `${money(Math.abs(profile.monthly.net))}/mo shortfall`,
      action: "Pause non-essential shopping for two weeks and move that cash to checking as a buffer.",
    });
  } else {
    advice.push({
      id: "cashflow-positive",
      title: "Put surplus cash to work",
      summary: `You have roughly ${money(profile.monthly.net)}/month of unallocated surplus after expenses.`,
      detail: "Idle surplus in checking rarely compounds. Split it between high-APR debt payoff and savings until your emergency fund hits three months.",
      priority: "low",
      category: "cashflow",
      impactLabel: `${money(profile.monthly.net)}/mo surplus`,
      action: "Create a split rule: 60% extra debt payment, 40% savings, until high-APR balances are cleared.",
    });
  }

  const topCategory = profile.categoryBreakdown[0];
  if (topCategory && topCategory.share >= 0.28 && topCategory.category !== "Housing") {
    advice.push({
      id: "category-concentration",
      title: `${topCategory.category} is dominating your budget`,
      summary: `${topCategory.category} is ${pct(topCategory.share)} of tracked spending (${money(topCategory.amount)}/mo).`,
      detail: "When one non-housing category absorbs more than a quarter of spend, small habit changes there move the wellness score faster than cutting across everything.",
      priority: "low",
      category: "spending",
      impactLabel: `${pct(topCategory.share)} of spend`,
      action: `Cap ${topCategory.category.toLowerCase()} at ${money(topCategory.amount * 0.85)} next month and review mid-cycle.`,
    });
  }

  const priorityRank: Record<AdvicePriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  advice.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);

  const top = advice.find((a) => a.priority === "high") ?? advice[0];
  const headline = top
    ? top.title
    : "Your finances look steady—keep reinforcing good habits";

  const circumstances = [
    `Income ~${money(profile.monthly.income)}/mo`,
    `Essentials ~${money(profile.essentialMonthlySpend)}/mo`,
    `${money(profile.liquidAssets)} liquid`,
    `${money(profile.totalDebt)} total debt`,
    `Savings rate ${pct(profile.savingsRate)}`,
  ].join(" · ");

  return {
    wellnessScore: score,
    wellnessLabel: label,
    headline,
    circumstances,
    advice: advice.slice(0, 6),
    generatedAt: new Date().toISOString(),
  };
}
