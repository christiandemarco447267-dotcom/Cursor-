import { NextResponse } from "next/server";
import { getBankingMode, getBankingProvider } from "@/lib/banking/provider";

export async function POST() {
  try {
    const provider = getBankingProvider();
    const userId = `user_${Date.now()}`;
    const { linkToken } = await provider.createLinkToken(userId);

    return NextResponse.json({
      linkToken,
      mode: getBankingMode(),
      userId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create link token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
