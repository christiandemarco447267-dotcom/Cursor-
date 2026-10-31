// /feedback (public POST) and /feedback/list (owner only).
import type { Env } from "./env";

export const FEEDBACK_TYPES = ["bug", "idea", "praise", "survey"] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];
export const MESSAGE_MAX = 2000;

export type FeedbackRecord = {
  id: string;
  type: FeedbackType;
  message: string;
  email?: string;
  rating?: number;
  context?: Record<string, string | number | boolean>;
  createdAt: string;
};

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const CONTEXT_KEYS = ["page", "appVersion", "viewport", "userAgent", "dataSource", "portfolio"] as const;

export type ValidationResult = { ok: true; record: Omit<FeedbackRecord, "id" | "createdAt"> } | { ok: false; error: string; spam?: boolean };

export function validateFeedback(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid body." };
  const b = body as Record<string, unknown>;
  // Honeypot: a hidden "website" field real people never fill in.
  if (typeof b.website === "string" && b.website.trim() !== "") return { ok: false, error: "Rejected.", spam: true };
  const type = b.type;
  if (typeof type !== "string" || !(FEEDBACK_TYPES as readonly string[]).includes(type)) return { ok: false, error: "Pick a feedback type." };
  const message = typeof b.message === "string" ? b.message.trim() : "";
  const rating = typeof b.rating === "number" && Number.isInteger(b.rating) && b.rating >= 1 && b.rating <= 5 ? b.rating : undefined;
  if (type === "survey" && rating === undefined) return { ok: false, error: "Rating must be 1–5." };
  if (type !== "survey" && message.length < 3) return { ok: false, error: "Please write a short message." };
  if (message.length > MESSAGE_MAX) return { ok: false, error: `Message is limited to ${MESSAGE_MAX} characters.` };
  let email: string | undefined;
  if (typeof b.email === "string" && b.email.trim()) {
    email = b.email.trim().slice(0, 254);
    if (!EMAIL_RE.test(email)) return { ok: false, error: "That email doesn't look right." };
  }
  let context: FeedbackRecord["context"];
  if (b.context && typeof b.context === "object") {
    context = {};
    for (const key of CONTEXT_KEYS) {
      const v = (b.context as Record<string, unknown>)[key];
      if (typeof v === "string") context[key] = v.slice(0, key === "portfolio" ? 1500 : 200);
      else if (typeof v === "number" || typeof v === "boolean") context[key] = v;
    }
  }
  return { ok: true, record: { type: type as FeedbackType, message, email, rating, context } };
}

/** Newest-first KV keys: an inverted timestamp sorts later messages first. */
export function feedbackKey(now: number, rand: string): string {
  return `fb:${String(9_999_999_999_999 - now).padStart(13, "0")}:${rand}`;
}

export function webhookPayload(url: string, r: FeedbackRecord): unknown {
  const head = `Sentia ${r.type}${r.rating ? ` (${r.rating}/5)` : ""}${r.email ? ` from ${r.email}` : ""}`;
  const page = r.context?.page ? ` · page ${r.context.page}` : "";
  const text = `**${head}**${page}\n${r.message || "(no message)"}`.slice(0, 1900);
  return /discord(app)?\.com\/api\/webhooks/.test(url) ? { content: text, allowed_mentions: { parse: [] } } : { text };
}

export async function storeFeedback(env: Env, record: FeedbackRecord, now: number): Promise<void> {
  if (!env.SENTIA_KV) throw new Error("storage not configured");
  // Kept for one year.
  await env.SENTIA_KV.put(feedbackKey(now, record.id.slice(0, 8)), JSON.stringify(record), { expirationTtl: 365 * 86_400 });
}

export async function forwardFeedback(env: Env, record: FeedbackRecord, f: typeof fetch = fetch): Promise<void> {
  const url = env.FEEDBACK_WEBHOOK_URL;
  if (!url || !/^https:\/\//.test(url)) return;
  try {
    await f(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload(url, record)),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Forwarding is best-effort; the message is already stored.
  }
}

export async function listFeedback(env: Env, limit: number, cursor?: string): Promise<{ items: FeedbackRecord[]; cursor?: string }> {
  if (!env.SENTIA_KV) return { items: [] };
  const page = await env.SENTIA_KV.list({ prefix: "fb:", limit, cursor });
  const items = await Promise.all(page.keys.map(async (k) => JSON.parse((await env.SENTIA_KV!.get(k.name)) ?? "null") as FeedbackRecord | null));
  return { items: items.filter((i): i is FeedbackRecord => i !== null), cursor: page.list_complete ? undefined : page.cursor };
}
