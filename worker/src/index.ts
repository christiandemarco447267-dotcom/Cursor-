// Sentia pilot API (Cloudflare Worker).
//   GET  /health          which features are configured (no secrets revealed)
//   GET  /quote?symbols=  real quotes (Finnhub → Yahoo fallback)
//   POST /feedback        store a feedback message (+ optional webhook)
//   GET  /feedback/list   owner only (Authorization: Bearer ADMIN_TOKEN)
//   POST /event           anonymous usage counts (aggregate per day)
//   GET  /stats?days=7    owner only: daily usage counts
//   POST /coach           streamed AI coach answer (text/plain)
import { callCoach, CoachError, MAX_OUTPUT_TOKENS, resolveProvider, validateCoachRequest } from "./coach";
import { intVar, type Env } from "./env";
import { listFeedback, MESSAGE_MAX, storeFeedback, forwardFeedback, validateFeedback, type FeedbackRecord } from "./feedback";
import { readStats, recordBatch, tallyBatch } from "./events";
import { clientIp, corsHeaders, errorJson, isAdmin, isAllowedOrigin, json, readJson } from "./http";
import { getQuotes, parseSymbols } from "./quote";
import { ipBucket, kvCounter, MemoryRateLimiter } from "./ratelimit";

const quoteLimiter = new MemoryRateLimiter(60, 60_000);
const eventLimiter = new MemoryRateLimiter(30, 60_000);
const feedbackBurst = new MemoryRateLimiter(3, 60_000);
const coachBurst = new MemoryRateLimiter(6, 60_000);

type Ctx = Pick<ExecutionContext, "waitUntil">;

export async function handle(request: Request, env: Env, ctx: Ctx, f: typeof fetch = fetch, now: number = Date.now()): Promise<Response> {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  const cors = corsHeaders(origin, env);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (request.method === "OPTIONS") {
    return new Response(null, { status: isAllowedOrigin(origin, env) ? 204 : 403, headers: cors });
  }
  // Browsers on other websites are refused; tools without an Origin (curl, the owner) are allowed.
  if (origin && !isAllowedOrigin(origin, env)) return errorJson(403, "Origin not allowed.", cors);

  const ip = clientIp(request);

  try {
    if (path === "/" || path === "/health") {
      return json(
        {
          ok: true,
          quotes: { finnhub: Boolean(env.FINNHUB_API_KEY), yahooFallback: true },
          coach: Boolean(resolveProvider(env)),
          feedback: Boolean(env.SENTIA_KV),
          analytics: Boolean(env.SENTIA_KV),
        },
        200,
        { ...cors, "Cache-Control": "no-store" },
      );
    }

    if (path === "/quote" && request.method === "GET") {
      const limit = quoteLimiter.check(ip, now);
      if (!limit.ok) return errorJson(429, "Too many requests.", { ...cors, "Retry-After": String(limit.retryAfterSeconds) });
      const parsed = parseSymbols(url.searchParams.get("symbols"), env);
      if ("error" in parsed) return errorJson(400, parsed.error, cors);
      const body = await getQuotes(parsed.symbols, env, f, now);
      return json(body, 200, { ...cors, "Cache-Control": "no-store" });
    }

    if (path === "/feedback" && request.method === "POST") {
      if (!env.SENTIA_KV) return errorJson(503, "Feedback storage is not configured.", cors);
      if (!feedbackBurst.check(ip, now).ok) return errorJson(429, "Please wait a minute before sending more feedback.", cors);
      const body = await readJson(request, MESSAGE_MAX * 2 + 4000);
      const result = validateFeedback(body);
      // Pretend success to bots that fill the honeypot, so they don't adapt.
      if (!result.ok) return result.spam ? json({ ok: true }, 200, cors) : errorJson(400, result.error, cors);
      const hourly = await kvCounter(env.SENTIA_KV, `${await ipBucket(ip, "fb", now)}:${new Date(now).getUTCHours()}`, 10, 3600);
      if (!hourly.ok) return errorJson(429, "Feedback limit reached for now. Try again later.", cors);
      const record: FeedbackRecord = { ...result.record, id: crypto.randomUUID(), createdAt: new Date(now).toISOString() };
      await storeFeedback(env, record, now);
      ctx.waitUntil(forwardFeedback(env, record, f));
      return json({ ok: true, id: record.id }, 201, cors);
    }

    if (path === "/feedback/list" && request.method === "GET") {
      if (!isAdmin(request, env)) return errorJson(401, "Unauthorized.", cors);
      const limit = intVar(url.searchParams.get("limit") ?? undefined, 50, 1, 200);
      const page = await listFeedback(env, limit, url.searchParams.get("cursor") ?? undefined);
      return json(page, 200, { ...cors, "Cache-Control": "no-store" });
    }

    if (path === "/event" && request.method === "POST") {
      if (!env.SENTIA_KV) return errorJson(503, "Analytics storage is not configured.", cors);
      if (!eventLimiter.check(ip, now).ok) return errorJson(429, "Too many requests.", cors);
      const add = tallyBatch(await readJson(request, 8000));
      if (!add) return errorJson(400, "No valid events.", cors);
      await recordBatch(env, add, now);
      return new Response(null, { status: 204, headers: cors });
    }

    if (path === "/stats" && request.method === "GET") {
      if (!isAdmin(request, env)) return errorJson(401, "Unauthorized.", cors);
      const days = intVar(url.searchParams.get("days") ?? undefined, 7, 1, 60);
      return json({ days: await readStats(env, days, now) }, 200, { ...cors, "Cache-Control": "no-store" });
    }

    if (path === "/coach" && request.method === "POST") {
      if (!resolveProvider(env)) return errorJson(503, "AI coach is not configured.", cors);
      if (!coachBurst.check(ip, now).ok) return errorJson(429, "Slow down a little — try again in a minute.", cors);
      const parsed = validateCoachRequest(await readJson(request, 10_000));
      if (!parsed.ok) return errorJson(400, parsed.error, cors);
      if (env.SENTIA_KV) {
        const perIp = intVar(env.COACH_DAILY_LIMIT_PER_IP, 30, 1, 10_000);
        const total = intVar(env.COACH_DAILY_LIMIT_TOTAL, 500, 1, 1_000_000);
        const mine = await kvCounter(env.SENTIA_KV, await ipBucket(ip, "coach", now), perIp, 86_400);
        if (!mine.ok) return errorJson(429, "Daily AI coach limit reached. The built-in coach still works.", cors);
        const all = await kvCounter(env.SENTIA_KV, `rl:coach-total:${new Date(now).toISOString().slice(0, 10)}`, total, 86_400);
        if (!all.ok) return errorJson(429, "The AI coach is resting for today. The built-in coach still works.", cors);
      }
      const { stream, provider, model } = await callCoach(env, parsed.value, f);
      return new Response(stream, {
        status: 200,
        headers: {
          ...cors,
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Coach-Provider": provider,
          "X-Coach-Model": model,
          "X-Coach-Max-Tokens": String(MAX_OUTPUT_TOKENS),
          "Access-Control-Expose-Headers": "X-Coach-Provider, X-Coach-Model",
        },
      });
    }

    return errorJson(404, "Not found.", cors);
  } catch (error) {
    if (error instanceof CoachError) return errorJson(error.status, error.message, cors);
    return errorJson(500, "Something went wrong.", cors);
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return handle(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
