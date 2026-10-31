// Where the optional Sentia API (the Cloudflare Worker in /worker) lives.
// Set NEXT_PUBLIC_SENTIA_API_URL at build time (a GitHub repo *variable* for the
// Pages build). When it's missing or malformed every feature that needs it falls
// back gracefully: demo prices, mailto feedback, the built-in coach, no analytics.

/** Normalise a configured base URL; returns "" when unset or unsafe. */
export function normalizeApiUrl(raw: string | undefined | null): string {
  const value = (raw ?? "").trim().replace(/\/+$/, "");
  if (!value) return "";
  try {
    const url = new URL(value);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return "";
    if (url.search || url.hash || url.username || url.password) return "";
    return value;
  } catch {
    return "";
  }
}

export const SENTIA_API_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_SENTIA_API_URL);

export function apiConfigured(): boolean {
  return SENTIA_API_URL !== "";
}

export function apiUrl(path: string): string {
  return `${SENTIA_API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** App version shown in feedback context. */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "dev";
