import { NextResponse } from "next/server";
import { getBankingMode } from "@/lib/banking/provider";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  return NextResponse.json({
    mode: getBankingMode(),
    connected: Boolean(session),
    institutionName: session?.institutionName ?? null,
    connectedAt: session?.connectedAt ?? null,
  });
}
