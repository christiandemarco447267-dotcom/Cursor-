import { NextResponse } from "next/server";
import { getBankingMode, getBankingProvider } from "@/lib/banking/provider";
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

    return NextResponse.json({
      mode: getBankingMode(),
      connection: {
        ...snapshot.connection,
        institutionName: session.institutionName || snapshot.connection.institutionName,
      },
      accounts: snapshot.accounts,
      transactions: snapshot.transactions,
      profile,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load banking data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
