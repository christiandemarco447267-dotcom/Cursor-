import { describe, expect, it } from "vitest";
import { handle } from "../src/index";
import { feedbackKey, validateFeedback, webhookPayload } from "../src/feedback";
import { normalizePage, tallyBatch } from "../src/events";
import { ctx, FakeKV, makeEnv, mockFetch, PAGES } from "./helpers";

const NOW = Date.parse("2026-10-30T15:00:00Z");
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`https://api.test${path}`, { method: "POST", headers: { "Content-Type": "application/json", Origin: PAGES, ...headers }, body: JSON.stringify(body) });

describe("feedback validation", () => {
  it("accepts a normal message and strips unknown context keys", () => {
    const r = validateFeedback({ type: "bug", message: "Chart is blank", email: "a@b.co", context: { page: "/app", secret: "x", viewport: "390x844" } });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.record.context).toEqual({ page: "/app", viewport: "390x844" });
  });
  it("flags the honeypot, caps length and checks email", () => {
    expect(validateFeedback({ type: "idea", message: "hello", website: "spam.biz" })).toMatchObject({ ok: false, spam: true });
    expect(validateFeedback({ type: "idea", message: "x".repeat(2001) }).ok).toBe(false);
    expect(validateFeedback({ type: "idea", message: "hello", email: "nope" }).ok).toBe(false);
    expect(validateFeedback({ type: "other", message: "hello" }).ok).toBe(false);
    expect(validateFeedback({ type: "survey", rating: 6 }).ok).toBe(false);
    expect(validateFeedback({ type: "survey", rating: 4 }).ok).toBe(true);
  });
  it("sorts newest first and formats Discord vs Slack webhooks", () => {
    expect(feedbackKey(2000, "a") < feedbackKey(1000, "a")).toBe(true);
    const rec = { id: "1", type: "praise" as const, message: "Love it", createdAt: "" };
    expect(webhookPayload("https://discord.com/api/webhooks/1/x", rec)).toHaveProperty("content");
    expect(webhookPayload("https://hooks.slack.com/services/x", rec)).toHaveProperty("text");
  });
});

describe("/feedback routes", () => {
  it("stores, forwards to the webhook, and lists only with the admin token", async () => {
    const kv = new FakeKV();
    const { f, calls } = mockFetch([["hooks.slack.com", () => new Response("ok")]]);
    const env = makeEnv({ ADMIN_TOKEN: "a-very-long-admin-token-123", FEEDBACK_WEBHOOK_URL: "https://hooks.slack.com/services/x" }, kv);
    const res = await handle(post("/feedback", { type: "idea", message: "Add crypto", context: { page: "/app/trade" } }), env, ctx, f, NOW);
    expect(res.status).toBe(201);
    await new Promise((r) => setTimeout(r, 0));
    expect(calls.some((c) => c.url.includes("slack"))).toBe(true);

    const denied = await handle(new Request("https://api.test/feedback/list"), env, ctx, f, NOW);
    expect(denied.status).toBe(401);
    const wrong = await handle(new Request("https://api.test/feedback/list", { headers: { Authorization: "Bearer nope" } }), env, ctx, f, NOW);
    expect(wrong.status).toBe(401);
    const list = await handle(new Request("https://api.test/feedback/list", { headers: { Authorization: "Bearer a-very-long-admin-token-123" } }), env, ctx, f, NOW);
    const body = (await list.json()) as { items: { message: string }[] };
    expect(body.items[0]?.message).toBe("Add crypto");
  });

  it("silently drops honeypot submissions without storing them", async () => {
    const kv = new FakeKV();
    const res = await handle(post("/feedback", { type: "bug", message: "buy pills", website: "x" }, { "CF-Connecting-IP": "5.5.5.5" }), makeEnv({}, kv), ctx, fetch, NOW);
    expect(res.status).toBe(200);
    expect([...kv.store.keys()].some((k) => k.startsWith("fb:"))).toBe(false);
  });

  it("says storage is not configured when there is no KV", async () => {
    const res = await handle(post("/feedback", { type: "bug", message: "hello there" }), makeEnv({}, null), ctx, fetch, NOW);
    expect(res.status).toBe(503);
  });

  it("rate-limits bursts from one IP", async () => {
    const env = makeEnv();
    const statuses: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const r = await handle(post("/feedback", { type: "bug", message: `msg ${i}` }, { "CF-Connecting-IP": "7.7.7.7" }), env, ctx, fetch, NOW);
      statuses.push(r.status);
    }
    expect(statuses.slice(0, 3)).toEqual([201, 201, 201]);
    expect(statuses[4]).toBe(429);
  });
});

describe("/event analytics", () => {
  it("accepts only named events and folds unknown pages into 'other'", () => {
    expect(normalizePage("/app/trade?symbol=AAPL")).toBe("/app/trade");
    expect(normalizePage("/app/settings/")).toBe("/app/settings");
    expect(normalizePage("/users/jane@example.com")).toBe("other");
    const t = tallyBatch({ events: [{ name: "page_view", page: "/app" }, { name: "trade_placed" }, { name: "evil" }, { name: "trade_placed", email: "x@y.z" }] });
    expect(t).toEqual({ events: { page_view: 1, trade_placed: 2 }, pages: { "/app": 1 } });
    expect(tallyBatch({ events: [] })).toBeNull();
  });

  it("aggregates daily counters with one KV write per batch and exposes them to the owner", async () => {
    const kv = new FakeKV();
    const env = makeEnv({ ADMIN_TOKEN: "a-very-long-admin-token-123" }, kv);
    await handle(post("/event", { events: [{ name: "page_view", page: "/app" }, { name: "coach_asked" }] }), env, ctx, fetch, NOW);
    expect(kv.writes).toBe(1);
    await handle(post("/event", { events: [{ name: "page_view", page: "/app" }] }), env, ctx, fetch, NOW);
    const stats = await handle(new Request("https://api.test/stats?days=2", { headers: { Authorization: "Bearer a-very-long-admin-token-123" } }), env, ctx, fetch, NOW);
    const body = (await stats.json()) as { days: { day: string; events: Record<string, number>; pages: Record<string, number> }[] };
    expect(body.days[0]).toEqual({ day: "2026-10-30", events: { page_view: 2, coach_asked: 1 }, pages: { "/app": 2 } });
    // Nothing identifying is stored.
    expect(JSON.stringify([...kv.store.entries()])).not.toMatch(/\d+\.\d+\.\d+\.\d+/);
  });
});
