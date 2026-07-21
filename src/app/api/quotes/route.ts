import { NextResponse } from "next/server";
import { fetchQuotes } from "@/lib/quotes";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { quotesRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = rateLimit(`quotes:${clientKey(request)}`, 40, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("symbols") ?? "";
  const symbols = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const parsed = quotesRequestSchema.safeParse({ symbols });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid symbols", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await fetchQuotes(parsed.data.symbols);
    return NextResponse.json(
      {
        quotes: result.quotes,
        source: result.source,
        asOf: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "private, max-age=30",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to fetch quotes" },
      { status: 502 },
    );
  }
}
