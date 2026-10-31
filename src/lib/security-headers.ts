/**
 * Security headers applied to every response by `proxy.ts`.
 *
 * The CSP intentionally avoids `'unsafe-eval'` in production. `'unsafe-inline'`
 * is still required for styles and Next.js's hydration bootstrap because this
 * app does not use a per-request nonce. `'unsafe-eval'` is only permitted in
 * development, where the dev bundler relies on it.
 */
export function getSecurityHeaders(
  isDev = process.env.NODE_ENV !== "production",
  apiUrl = process.env.NEXT_PUBLIC_SENTIA_API_URL ?? "",
): Record<string, string> {
  // The optional Sentia API (Cloudflare Worker) for real quotes, feedback, usage counts and the AI coach.
  let apiOrigin = "";
  try {
    apiOrigin = apiUrl ? new URL(apiUrl).origin : "";
  } catch {
    apiOrigin = "";
  }
  // Google hosts serve reCAPTCHA (required by Firebase phone auth / SMS two-step verification).
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    ...(isDev ? ["'unsafe-eval'"] : []),
    "https://www.google.com",
    "https://www.gstatic.com",
    "https://apis.google.com",
  ].join(" ");

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSrc}`,
    // 'self' for the API proxy; the Sentia API origin when configured;
    // Google/Firebase endpoints for Firebase Auth + Firestore (accounts & cloud sync).
    `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ""} https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebaseapp.com https://www.google.com`,
    // Firebase Auth helper iframe + reCAPTCHA challenge frames.
    "frame-src 'self' https://*.firebaseapp.com https://www.google.com https://recaptcha.google.com",
    "form-action 'self'",
  ].join("; ");

  return {
    "Content-Security-Policy": csp,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    "X-DNS-Prefetch-Control": "off",
  };
}
