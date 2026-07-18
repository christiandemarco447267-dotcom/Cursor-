import { NextResponse } from "next/server";
import { getBankingMode, getBankingProvider } from "@/lib/banking/provider";
import { encodeSession, HARBOR_SESSION_COOKIE } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      publicToken?: string;
      userId?: string;
      institutionName?: string;
    };

    const provider = getBankingProvider();
    const publicToken = body.publicToken ?? "sandbox-demo";
    const connection = await provider.exchangePublicToken(publicToken);
    const institutionName =
      body.institutionName?.trim() || connection.institutionName;

    const session = {
      userId: body.userId ?? `user_${Date.now()}`,
      itemId: connection.itemId,
      institutionName,
      connectedAt: connection.connectedAt,
    };

    const response = NextResponse.json({
      ok: true,
      mode: getBankingMode(),
      institutionName,
      itemId: connection.itemId,
    });

    response.cookies.set(HARBOR_SESSION_COOKIE, encodeSession(session), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
