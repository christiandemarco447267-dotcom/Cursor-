import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSecurityHeaders } from "@/lib/security-headers";

// Next.js 16 renamed the `middleware` convention to `proxy`.
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(getSecurityHeaders())) {
    response.headers.set(key, value);
  }
  // The app shell contains local-only data views; don't let intermediaries cache it.
  if (request.nextUrl.pathname.startsWith("/app")) {
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
