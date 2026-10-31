// /event — privacy-friendly usage counts. Only named events and a coarse page
// name are accepted; everything is folded into one aggregate counter document
// per day. No IPs, cookies, user IDs or free text are stored.
import type { Env } from "./env";
import { dayKey } from "./http";

export const EVENT_NAMES = [
  "page_view",
  "trade_placed",
  "thesis_created",
  "time_machine_finished",
  "coach_asked",
  "feedback_sent",
] as const;
export type EventName = (typeof EVENT_NAMES)[number];

/** Pages we count views for. Anything else is folded into "other". */
export const KNOWN_PAGES = [
  "/",
  "/app",
  "/app/portfolio",
  "/app/trade",
  "/app/markets",
  "/app/watchlist",
  "/app/allocate",
  "/app/thesis",
  "/app/insights",
  "/app/coach",
  "/app/legends",
  "/app/time-machine",
  "/app/leagues",
  "/app/settings",
  "/privacy",
  "/terms",
] as const;

export type DayCounts = { day: string; events: Record<string, number>; pages: Record<string, number> };

export const MAX_BATCH = 25;

export function normalizePage(raw: unknown): string {
  if (typeof raw !== "string") return "other";
  const path = raw.split(/[?#]/)[0]!.replace(/\/+$/, "") || "/";
  return (KNOWN_PAGES as readonly string[]).includes(path) ? path : "other";
}

/** Validate a batch → tallies to add. Invalid entries are dropped, not stored. */
export function tallyBatch(body: unknown): { events: Record<string, number>; pages: Record<string, number> } | null {
  if (!body || typeof body !== "object") return null;
  const list = (body as { events?: unknown }).events;
  if (!Array.isArray(list) || list.length === 0 || list.length > MAX_BATCH) return null;
  const events: Record<string, number> = {};
  const pages: Record<string, number> = {};
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const name = (item as { name?: unknown }).name;
    if (typeof name !== "string" || !(EVENT_NAMES as readonly string[]).includes(name)) continue;
    events[name] = (events[name] ?? 0) + 1;
    if (name === "page_view") {
      const page = normalizePage((item as { page?: unknown }).page);
      pages[page] = (pages[page] ?? 0) + 1;
    }
  }
  return Object.keys(events).length ? { events, pages } : null;
}

export function mergeCounts(base: DayCounts, add: { events: Record<string, number>; pages: Record<string, number> }): DayCounts {
  const events = { ...base.events };
  const pages = { ...base.pages };
  for (const [k, v] of Object.entries(add.events)) events[k] = (events[k] ?? 0) + v;
  for (const [k, v] of Object.entries(add.pages)) pages[k] = (pages[k] ?? 0) + v;
  return { day: base.day, events, pages };
}

/** One read + one write per batch (KV free tier allows 1,000 writes/day). Counts are approximate under concurrency. */
export async function recordBatch(env: Env, add: { events: Record<string, number>; pages: Record<string, number> }, now: number): Promise<void> {
  if (!env.SENTIA_KV) throw new Error("storage not configured");
  const day = dayKey(now);
  const key = `ev:${day}`;
  const existing = (await env.SENTIA_KV.get(key, "json")) as DayCounts | null;
  const merged = mergeCounts(existing ?? { day, events: {}, pages: {} }, add);
  await env.SENTIA_KV.put(key, JSON.stringify(merged), { expirationTtl: 400 * 86_400 });
}

export async function readStats(env: Env, days: number, now: number): Promise<DayCounts[]> {
  if (!env.SENTIA_KV) return [];
  const out: DayCounts[] = [];
  for (let i = 0; i < days; i += 1) {
    const day = dayKey(now - i * 86_400_000);
    const doc = (await env.SENTIA_KV.get(`ev:${day}`, "json")) as DayCounts | null;
    out.push(doc ?? { day, events: {}, pages: {} });
  }
  return out;
}
