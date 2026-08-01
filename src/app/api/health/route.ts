import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "trellis",
    version: "1.0.0",
    time: new Date().toISOString(),
  });
}
