import { NextResponse } from "next/server";
import { getBankingProvider } from "@/lib/banking/provider";
import { generateAdvice } from "@/lib/finance/advice";
import { buildFinancialProfile } from "@/lib/finance/analytics";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not connected" }, { status: 401 });
  }

  try {
    const provider = getBankingProvider();
    const snapshot = await provider.getSnapshot(session.itemId);
    const profile = buildFinancialProfile(snapshot.accounts, snapshot.transactions);
    const report = generateAdvice(profile);

    return NextResponse.json({
      report,
      profile: {
        liquidAssets: profile.liquidAssets,
        totalDebt: profile.totalDebt,
        creditCardDebt: profile.creditCardDebt,
        monthly: profile.monthly,
        savingsRate: profile.savingsRate,
        emergencyFundMonths: profile.emergencyFundMonths,
        categoryBreakdown: profile.categoryBreakdown,
        subscriptions: profile.subscriptions,
        subscriptionMonthlyTotal: profile.subscriptionMonthlyTotal,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate advice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
