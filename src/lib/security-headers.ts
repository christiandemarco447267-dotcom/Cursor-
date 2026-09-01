/**
 * Security headers applied to every response by `proxy.ts`.
 *
 * The CSP intentionally avoids `'unsafe-eval'` in production. `'unsafe-inline'`
 * is still required for styles and Next.js's hydration bootstrap because this
 * app does not use a per-request nonce. `'unsafe-eval'` is only permitted in
 * development, where the dev bundler relies on it.
 */
export function getSecurityHeaders(isDev = process.env.NODE_ENV !== "production"): Record<string, string> {
  const scriptSrc = ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])].join(" ");

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSrc}`,
    // 'self' for the API proxy; finnhub.io for optional client-side realtime quotes.
    "connect-src 'self' https://finnhub.io",
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
