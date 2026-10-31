import { describe, expect, it } from "vitest";
import { handle } from "../src/index";
import { buildProviderRequest, buildUserMessage, deltaFromSseLine, DEFAULT_MODELS, MAX_OUTPUT_TOKENS, resolveProvider, SYSTEM_PROMPT, validateCoachRequest } from "../src/coach";
import { ctx, FakeKV, makeEnv, mockFetch, PAGES, sseStream } from "./helpers";

const NOW = Date.parse("2026-10-30T15:00:00Z");
const ask = (body: unknown, ip = "1.2.3.4") =>
  new Request("https://api.test/coach", { method: "POST", headers: { Origin: PAGES, "CF-Connecting-IP": ip }, body: JSON.stringify(body) });

describe("coach prompt", () => {
  it("has the strict rules", () => {
    expect(SYSTEM_PROMPT).toMatch(/Never tell the user to buy, sell/);
    expect(SYSTEM_PROMPT).toMatch(/Never predict prices/);
    expect(SYSTEM_PROMPT).toMatch(/Never invent/);
    expect(SYSTEM_PROMPT).toMatch(/missing or marked 'not available'/);
    expect(SYSTEM_PROMPT).toMatch(/not investment advice/);
  });
  it("wraps the user's data and says so when none was sent", () => {
    expect(buildUserMessage({ question: "How am I doing?", context: "Cash: $1,000.00" })).toContain("<<<\nCash: $1,000.00\n>>>");
    expect(buildUserMessage({ question: "Hi", context: "" })).toContain("No portfolio data was provided.");
  });
  it("validates size limits", () => {
    expect(validateCoachRequest({ question: "x".repeat(301), context: "" }).ok).toBe(false);
    expect(validateCoachRequest({ question: "ok?", context: "x".repeat(6001) }).ok).toBe(false);
    expect(validateCoachRequest({ question: "ok?", context: "c" }).ok).toBe(true);
  });
});

describe("provider selection + requests", () => {
  it("picks the configured provider with cheap defaults, falling back to whichever key exists", () => {
    expect(resolveProvider({})).toBeNull();
    expect(resolveProvider({ OPENAI_API_KEY: "o" })).toMatchObject({ provider: "openai", model: DEFAULT_MODELS.openai });
    expect(resolveProvider({ COACH_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "a", COACH_MODEL: "claude-x" })).toMatchObject({ provider: "anthropic", model: "claude-x" });
    expect(resolveProvider({ COACH_PROVIDER: "anthropic", OPENAI_API_KEY: "o" })).toMatchObject({ provider: "openai" });
  });
  it("caps output tokens and streams for both providers", () => {
    const o = JSON.parse(String(buildProviderRequest("openai", "m", "k", { question: "q", context: "c" }).init.body));
    expect(o).toMatchObject({ max_completion_tokens: MAX_OUTPUT_TOKENS, stream: true });
    expect(o.messages[0]).toEqual({ role: "system", content: SYSTEM_PROMPT });
    const a = buildProviderRequest("anthropic", "m", "k", { question: "q", context: "c" });
    const ab = JSON.parse(String(a.init.body));
    expect(ab).toMatchObject({ max_tokens: MAX_OUTPUT_TOKENS, stream: true, system: SYSTEM_PROMPT });
    expect((a.init.headers as Record<string, string>)["x-api-key"]).toBe("k");
  });
  it("parses SSE deltas for both providers", () => {
    expect(deltaFromSseLine("openai", 'data: {"choices":[{"delta":{"content":"Hi"}}]}')).toBe("Hi");
    expect(deltaFromSseLine("openai", "data: [DONE]")).toBe("");
    expect(deltaFromSseLine("anthropic", 'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Yo"}}')).toBe("Yo");
    expect(deltaFromSseLine("anthropic", "event: ping")).toBe("");
  });
});

describe("/coach route", () => {
  it("streams plain text from an OpenAI-style SSE response", async () => {
    const { f, calls } = mockFetch([
      ["api.openai.com", () => new Response(sseStream([
        'data: {"choices":[{"delta":{"content":"Your cash is "}}]}',
        'data: {"choices":[{"delta":{"content":"$1,000.00."}}]}',
        "data: [DONE]",
      ]))],
    ]);
    const res = await handle(ask({ question: "How much cash?", context: "Cash: $1,000.00" }), makeEnv({ OPENAI_API_KEY: "sk-test" }), ctx, f, NOW);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Coach-Provider")).toBe("openai");
    expect(await res.text()).toBe("Your cash is $1,000.00.");
    expect(calls[0]?.url).toContain("chat/completions");
  });

  it("returns 503 when no LLM key is configured and hides provider errors", async () => {
    expect((await handle(ask({ question: "hi?", context: "" }), makeEnv(), ctx, fetch, NOW)).status).toBe(503);
    const { f } = mockFetch([["api.anthropic.com", () => new Response('{"error":"bad key sk-ant-123"}', { status: 401 })]]);
    const res = await handle(ask({ question: "hi?", context: "" }, "8.8.8.8"), makeEnv({ ANTHROPIC_API_KEY: "a", COACH_PROVIDER: "anthropic" }), ctx, f, NOW);
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain("sk-ant");
  });

  it("enforces the per-IP daily cap", async () => {
    const kv = new FakeKV();
    const { f } = mockFetch([["api.openai.com", () => new Response(sseStream(['data: {"choices":[{"delta":{"content":"ok"}}]}']))]]);
    const env = makeEnv({ OPENAI_API_KEY: "k", COACH_DAILY_LIMIT_PER_IP: "2" }, kv);
    const s: number[] = [];
    for (let i = 0; i < 3; i += 1) s.push((await handle(ask({ question: "q?", context: "" }, "4.4.4.4"), env, ctx, f, NOW + i)).status);
    expect(s).toEqual([200, 200, 429]);
  });
});
