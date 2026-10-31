// Privacy-friendly usage counts. OFF until the user accepts (first-run notice or
// Settings). When on, only a page name or one of a few named events is sent to the
// Sentia API, which adds them to anonymous daily totals. No cookies, no IDs, no
// portfolio data, no free text. With no API configured nothing is ever sent.
import { apiConfigured, apiUrl } from "./api-config";

export const ANALYTICS_EVENTS = ["trade_placed", "thesis_created", "time_machine_finished", "coach_asked", "feedback_sent"] as const;
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export type Consent = "granted" | "denied" | "unset";
export const CONSENT_KEY = "sentia.analytics.v1";

type Queued = { name: "page_view" | AnalyticsEvent; page?: string };

const listeners = new Set<() => void>();
let queue: Queued[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let flushInstalled = false;
const FLUSH_MS = 10_000;
const MAX_QUEUE = 25;

export function readConsent(): Consent {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : "unset";
  } catch {
    return "unset";
  }
}

export function setConsent(value: "granted" | "denied") {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Storage blocked: the choice lasts for this tab only.
  }
  memoryConsent = value;
  if (value === "denied") queue = [];
  for (const l of listeners) l();
}

let memoryConsent: Consent | null = null;
function consent(): Consent {
  return memoryConsent ?? readConsent();
}

export function subscribeConsent(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Can analytics run at all on this build? (needs the Sentia API) */
export function analyticsAvailable(): boolean {
  return apiConfigured();
}

/** Strip query/hash and the deployment base path so only the page name is counted. */
export function pageName(pathname: string, basePath: string = process.env.NEXT_PUBLIC_BASE_PATH ?? ""): string {
  let path = pathname.split(/[?#]/)[0] || "/";
  if (basePath && path.startsWith(basePath)) path = path.slice(basePath.length) || "/";
  return path.replace(/\/+$/, "") || "/";
}

function enqueue(item: Queued) {
  if (typeof window === "undefined" || !analyticsAvailable() || consent() !== "granted") return;
  queue.push(item);
  if (queue.length >= MAX_QUEUE) {
    flush();
    return;
  }
  if (!timer) timer = setTimeout(flush, FLUSH_MS);
  if (!flushInstalled) {
    flushInstalled = true;
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flush());
  }
}

export function flush() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (queue.length === 0 || consent() !== "granted") {
    queue = [];
    return;
  }
  const events = queue.splice(0, MAX_QUEUE);
  try {
    void fetch(apiUrl("/event"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
      keepalive: true,
      credentials: "omit",
    }).catch(() => undefined);
  } catch {
    // Analytics must never break the app.
  }
}

export function trackPageView(pathname: string) {
  enqueue({ name: "page_view", page: pageName(pathname) });
}

export function track(name: AnalyticsEvent) {
  enqueue({ name });
}
