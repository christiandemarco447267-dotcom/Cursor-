import type { BankAccount, Transaction } from "@/lib/banking/types";

export interface CategorySpend {
  category: string;
  amount: number;
  share: number;
}

export interface MonthlyCashFlow {
  income: number;
  expenses: number;
  net: number;
  savingsTransfers: number;
}

export interface SubscriptionSignal {
  merchant: string;
  monthlyAmount: number;
  occurrences: number;
}

export interface FinancialProfile {
  liquidAssets: number;
  creditCardDebt: number;
  loanDebt: number;
  totalDebt: number;
  monthly: MonthlyCashFlow;
  savingsRate: number;
  emergencyFundMonths: number;
  essentialMonthlySpend: number;
  discretionaryMonthlySpend: number;
  categoryBreakdown: CategorySpend[];
  subscriptions: SubscriptionSignal[];
  subscriptionMonthlyTotal: number;
  highAprDebt: Array<{ name: string; balance: number; apr: number }>;
  diningOutMonthly: number;
  recentTransactions: Transaction[];
}

const ESSENTIAL_HINTS = [
  "rent",
  "utilities",
  "insurance",
  "loan",
  "telecommunication",
  "groceries",
  "gas stations",
  "payroll",
];

function isIncome(txn: Transaction): boolean {
  return txn.amount < 0 && txn.category.some((c) => /payroll|deposit|income/i.test(c));
}

function isExpense(txn: Transaction): boolean {
  return txn.amount > 0 && !txn.category.some((c) => /transfer|credit card|loan/i.test(c) && /payment|transfer/i.test(c));
}

function primaryCategory(txn: Transaction): string {
  if (txn.category.includes("Subscription")) return "Subscriptions";
  if (txn.category.includes("Groceries")) return "Groceries";
  if (txn.category.includes("Restaurants") || txn.category.includes("Coffee Shop")) {
    return "Dining & coffee";
  }
  if (txn.category.includes("Rent")) return "Housing";
  if (txn.category.includes("Utilities")) return "Utilities";
  if (txn.category.includes("Gas Stations") || txn.category.includes("Taxi")) {
    return "Transport";
  }
  if (txn.category.includes("Insurance")) return "Insurance";
  if (txn.category.some((c) => /shop|clothing|digital purchase|department/i.test(c))) {
    return "Shopping";
  }
  return txn.category[txn.category.length - 1] ?? "Other";
}

function isEssential(txn: Transaction): boolean {
  const blob = `${txn.name} ${txn.category.join(" ")}`.toLowerCase();
  return ESSENTIAL_HINTS.some((hint) => blob.includes(hint));
}

function monthsCovered(transactions: Transaction[]): number {
  if (transactions.length === 0) return 1;
  const dates = transactions.map((t) => new Date(t.date).getTime());
  const spanMs = Math.max(...dates) - Math.min(...dates);
  const months = spanMs / (1000 * 60 * 60 * 24 * 30.4);
  return Math.max(1, Math.min(3, months || 1));
}

export function buildFinancialProfile(
  accounts: BankAccount[],
  transactions: Transaction[],
): FinancialProfile {
  const months = monthsCovered(transactions);
  const posted = transactions.filter((t) => !t.pending);

  const income = posted.filter(isIncome).reduce((sum, t) => sum + Math.abs(t.amount), 0) / months;

  const savingsTransfers =
    posted
      .filter((t) => t.amount > 0 && t.category.some((c) => /savings/i.test(c)))
      .reduce((sum, t) => sum + t.amount, 0) / months;

  const expenseTxns = posted.filter(
    (t) =>
      t.amount > 0 &&
      !t.category.some((c) => c === "Transfer" || c === "Credit Card" || c === "Loan"),
  );

  const expenses = expenseTxns.reduce((sum, t) => sum + t.amount, 0) / months;

  const liquidAssets = accounts
    .filter((a) => a.type === "depository")
    .reduce((sum, a) => sum + a.currentBalance, 0);

  const creditCardDebt = accounts
    .filter((a) => a.type === "credit")
    .reduce((sum, a) => sum + Math.max(0, a.currentBalance), 0);

  const loanDebt = accounts
    .filter((a) => a.type === "loan")
    .reduce((sum, a) => sum + Math.max(0, a.currentBalance), 0);

  const categoryMap = new Map<string, number>();
  for (const txn of expenseTxns) {
    const key = primaryCategory(txn);
    categoryMap.set(key, (categoryMap.get(key) ?? 0) + txn.amount / months);
  }

  const categoryTotal = [...categoryMap.values()].reduce((a, b) => a + b, 0) || 1;
  const categoryBreakdown: CategorySpend[] = [...categoryMap.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      share: amount / categoryTotal,
    }))
    .sort((a, b) => b.amount - a.amount);

  const essentialMonthlySpend =
    expenseTxns.filter(isEssential).reduce((sum, t) => sum + t.amount, 0) / months;
  const discretionaryMonthlySpend = Math.max(0, expenses - essentialMonthlySpend);

  const subMap = new Map<string, { total: number; count: number }>();
  for (const txn of posted.filter(
    (t) => t.amount > 0 && t.category.includes("Subscription"),
  )) {
    const merchant = txn.merchantName ?? txn.name;
    const prev = subMap.get(merchant) ?? { total: 0, count: 0 };
    subMap.set(merchant, { total: prev.total + txn.amount, count: prev.count + 1 });
  }

  const subscriptions: SubscriptionSignal[] = [...subMap.entries()]
    .map(([merchant, v]) => ({
      merchant,
      monthlyAmount: v.total / months,
      occurrences: v.count,
    }))
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount);

  const subscriptionMonthlyTotal = subscriptions.reduce(
    (sum, s) => sum + s.monthlyAmount,
    0,
  );

  const diningOutMonthly =
    expenseTxns
      .filter((t) =>
        t.category.some((c) =>
          /restaurants|coffee shop|food and drink/i.test(c),
        ) && !t.category.includes("Groceries"),
      )
      .reduce((sum, t) => sum + t.amount, 0) / months;

  const highAprDebt = accounts
    .filter((a) => (a.apr ?? 0) >= 15 && a.currentBalance > 0)
    .map((a) => ({ name: a.name, balance: a.currentBalance, apr: a.apr ?? 0 }));

  const debtService =
    posted
      .filter(
        (t) =>
          t.amount > 0 &&
          t.category.some((c) => c === "Credit Card" || c === "Loan"),
      )
      .reduce((sum, t) => sum + t.amount, 0) / months;

  const monthly: MonthlyCashFlow = {
    income,
    expenses,
    net: income - expenses - savingsTransfers - debtService,
    savingsTransfers,
  };

  // Observed savings rate from money actually moved into savings accounts.
  const savingsRate = income > 0 ? savingsTransfers / income : 0;
  const emergencyFundMonths =
    essentialMonthlySpend > 0 ? liquidAssets / essentialMonthlySpend : 0;

  const recentTransactions = [...posted]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);

  return {
    liquidAssets,
    creditCardDebt,
    loanDebt,
    totalDebt: creditCardDebt + loanDebt,
    monthly,
    savingsRate,
    emergencyFundMonths,
    essentialMonthlySpend,
    discretionaryMonthlySpend,
    categoryBreakdown,
    subscriptions,
    subscriptionMonthlyTotal,
    highAprDebt,
    diningOutMonthly,
    recentTransactions,
  };
}

export function computeWellnessScore(profile: FinancialProfile): {
  score: number;
  label: string;
} {
  let score = 55;

  // Emergency fund: target 3–6 months
  if (profile.emergencyFundMonths >= 6) score += 18;
  else if (profile.emergencyFundMonths >= 3) score += 12;
  else if (profile.emergencyFundMonths >= 1) score += 5;
  else score -= 10;

  // Savings rate: target 15%+
  if (profile.savingsRate >= 0.2) score += 15;
  else if (profile.savingsRate >= 0.1) score += 10;
  else if (profile.savingsRate >= 0.05) score += 4;
  else score -= 8;

  // High-APR revolving debt pressure
  const highApr = profile.highAprDebt.reduce((s, d) => s + d.balance, 0);
  if (highApr === 0) score += 12;
  else if (highApr < profile.monthly.income * 0.25) score += 2;
  else if (highApr < profile.monthly.income) score -= 8;
  else score -= 16;

  // Subscription load vs income
  const subShare =
    profile.monthly.income > 0
      ? profile.subscriptionMonthlyTotal / profile.monthly.income
      : 0;
  if (subShare > 0.04) score -= 6;
  else if (subShare > 0.025) score -= 3;
  else score += 3;

  // Cash-flow health
  if (profile.monthly.net >= 0) score += 6;
  else score -= 10;

  score = Math.max(15, Math.min(98, Math.round(score)));

  let label = "Needs attention";
  if (score >= 80) label = "Strong footing";
  else if (score >= 65) label = "On track";
  else if (score >= 50) label = "Building momentum";

  return { score, label };
}

// Keep isExpense exported for potential UI filters
export { isExpense };
