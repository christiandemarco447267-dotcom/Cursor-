// Pilot features: real quotes, data-source honesty, feedback, analytics, AI coach context + fallback.
import assert from "node:assert/strict";
import { test } from "node:test";
import { askAiCoach, CoachFallback } from "./ai-coach";
import { pageName } from "./analytics";
import { normalizeApiUrl } from "./api-config";
import { feedSegment, maybeRecordSnapshot, quotesFeed, snapshotFeed } from "./benchmark";
import { CONTEXT_MAX_CHARS, buildCoachContext, fmtShares } from "./coach-context";
import { ruleBasedAnswer } from "./coach";
import { buildFeedbackContext, githubIssueLink, mailtoLink, validateFeedbackInput } from "./feedback";
import { feedChangeNotice } from "./feed-notice";
import { formatAsOfET, parseQuoteResponse, quoteBadge } from "./live-quotes";
import { resolveMarketFill } from "./market-fill";
import { processMarketTick } from "./market-tick";
import { placeOrder } from "./orders";
import { summarizePortfolio } from "./portfolio";
import { buy, createInitialState, saveProfile, sell } from "./storage";
import { shouldShowSurvey, SURVEY_DELAY_MS } from "./survey";
import type { AppState, PerfSnapshot, Quote } from "./types";

const demo = (symbol: string, price: number): Quote => ({ symbol, price, previousClose: price, changePercent: 0, source: "demo" });
const live = (symbol: string, price: number, source: Quote["source"] = "live"): Quote => ({
  symbol,
  price,
  previousClose: price,
  changePercent: 0,
  source,
  asOf: "2026-10-30T19:30:00.000Z",
  provider: "finnhub",
});

/** A small, fully known account: $10,000 deposit-free start, two buys, one sell. */
function account(): AppState {
  let s = createInitialState();
  s = { ...s, holdings: [], transactions: [], snapshots: [], theses: [], cash: 10_000 };
  s = buy(s, { symbol: "AAPL", shares: 10, price: 200 });
  s = buy(s, { symbol: "MSFT", shares: 2.5, price: 400 });
  s = sell(s, { symbol: "AAPL", shares: 4, price: 210 });
  return s;
}

// ---- API URL --------------------------------------------------------------------

test("normalizeApiUrl accepts https and localhost http only", () => {
  assert.equal(normalizeApiUrl("https://sentia-api.me.workers.dev/"), "https://sentia-api.me.workers.dev");
  assert.equal(normalizeApiUrl("http://127.0.0.1:8787"), "http://127.0.0.1:8787");
  assert.equal(normalizeApiUrl("http://example.com"), "");
  assert.equal(normalizeApiUrl("javascript:alert(1)"), "");
  assert.equal(normalizeApiUrl("https://x.dev/?key=secret"), "");
  assert.equal(normalizeApiUrl(undefined), "");
  assert.equal(normalizeApiUrl("   "), "");
});

// ---- Quotes -----------------------------------------------------------------------

test("parseQuoteResponse keeps valid real quotes, labels delayed ones, and lists missing symbols", () => {
  const parsed = parseQuoteResponse(
    {
      quotes: [
        { symbol: "AAPL", price: 214.5, previousClose: 210, change: 4.5, changePercent: 2.14, timestamp: "2026-10-30T19:30:00Z", source: "finnhub", delayed: false },
        { symbol: "MSFT", price: 430, previousClose: 425, timestamp: "2026-10-30T19:10:00Z", source: "yahoo", delayed: true },
        { symbol: "BAD", price: 0, previousClose: 1, timestamp: "2026-10-30T19:30:00Z" },
        { symbol: "NOTS", price: 5, previousClose: 4 },
      ],
      marketState: "open",
      asOf: "2026-10-30T19:30:05Z",
    },
    ["AAPL", "MSFT", "BAD", "NOTS", "ZZZ"],
  );
  assert.ok(parsed);
  assert.deepEqual(parsed.quotes.map((q) => [q.symbol, q.source]), [["AAPL", "live"], ["MSFT", "delayed"]]);
  assert.equal(parsed.quotes[1].changePercent, 1.18); // computed when absent
  assert.deepEqual(parsed.missing, ["BAD", "NOTS", "ZZZ"]);
  assert.equal(parsed.marketState, "open");
  assert.equal(parseQuoteResponse({ nope: true }, []), null);
});

test("quote badges say Live / Delayed / Demo with a New York time", () => {
  assert.equal(quoteBadge(undefined).kind, "demo");
  assert.equal(quoteBadge(demo("SPY", 1)).label, "Demo");
  const l = quoteBadge(live("AAPL", 1));
  assert.equal(l.label, "Live");
  assert.match(l.detail, /Finnhub/);
  assert.match(l.when, /ET$/);
  assert.equal(quoteBadge(live("AAPL", 1, "delayed")).label, "Delayed");
  // 19:30 UTC on Oct 30 2026 is 3:30 PM EDT.
  assert.match(formatAsOfET("2026-10-30T19:30:00.000Z"), /3:30\s?PM ET$/);
});

// ---- Market order pricing ----------------------------------------------------------

test("live market orders fill at the live price; the typed price is only a limit", () => {
  const q = live("AAPL", 214.5);
  assert.deepEqual(resolveMarketFill("buy", null, q), { ok: true, price: 214.5, basis: "live" });
  assert.deepEqual(resolveMarketFill("buy", 250, q), { ok: true, price: 214.5, basis: "live" }); // fills BELOW the typed price
  assert.equal(resolveMarketFill("buy", 200, q).ok, false); // market above the limit → no fill
  assert.equal(resolveMarketFill("sell", 220, q).ok, false); // market below the limit → no fill
  assert.deepEqual(resolveMarketFill("sell", 210, q), { ok: true, price: 214.5, basis: "live" });
  assert.deepEqual(resolveMarketFill("buy", 300, live("AAPL", 214.5, "delayed")), { ok: true, price: 214.5, basis: "live" });
});

test("demo market orders fill at the typed price and require one", () => {
  assert.deepEqual(resolveMarketFill("buy", 123.45, demo("AAPL", 100)), { ok: true, price: 123.45, basis: "typed" });
  assert.equal(resolveMarketFill("buy", null, demo("AAPL", 100)).ok, false);
  assert.equal(resolveMarketFill("buy", null, undefined).ok, false);
});

test("pending orders fill at live quotes through the normal fill engine", () => {
  let s = account();
  s = placeOrder(s, { symbol: "AAPL", side: "buy", type: "limit", shares: 1, triggerPrice: 205 });
  const r = processMarketTick(s, [live("AAPL", 204.1), live("MSFT", 400), live("SPY", 500)], Date.now());
  assert.equal(r.fills.length, 1);
  assert.equal(r.fills[0].price, 204.1);
});

// ---- Never mix demo and live ----------------------------------------------------------

test("snapshots record their feed and a feed change starts a new performance segment", () => {
  const base = account();
  const t0 = Date.parse("2026-10-30T14:00:00Z");
  let s = maybeRecordSnapshot(base, [demo("AAPL", 200), demo("MSFT", 400), demo("SPY", 500)], t0);
  assert.equal(s.snapshots.at(-1)?.src, "demo");
  // Switching to live records a fresh snapshot immediately, even inside the 5-minute interval.
  s = maybeRecordSnapshot(s, [live("AAPL", 260), live("MSFT", 420), live("SPY", 600)], t0 + 60_000);
  assert.equal(s.snapshots.length, 2);
  assert.equal(s.snapshots.at(-1)?.src, "live");
  assert.equal(s.snapshots.at(-1)?.flow, 0);
  assert.equal(feedSegment(s.snapshots).length, 1);
  // A mixed batch is never snapshotted.
  const mixed = maybeRecordSnapshot(s, [live("AAPL", 260), demo("MSFT", 420), live("SPY", 600)], t0 + 10 * 60_000);
  assert.equal(mixed.snapshots.length, 2);
  // Older snapshots without a source were simulated.
  const legacy: PerfSnapshot = { t: new Date(t0).toISOString(), value: 1, spy: 1, flow: 0 };
  assert.equal(snapshotFeed(legacy), "demo");
  assert.equal(quotesFeed([live("A", 1, "delayed")]), "live");
});

test("feedChangeNotice tells the user when switching sources changes valuations", () => {
  const s = account();
  const demoQ = [demo("AAPL", 200), demo("MSFT", 400)];
  const liveQ = [live("AAPL", 250), live("MSFT", 400)];
  const toLive = feedChangeNotice(s, { feed: "demo", quotes: demoQ }, { feed: "live", quotes: liveQ });
  assert.ok(toLive);
  assert.match(toLive.title, /real market prices/);
  const after = summarizePortfolio(s, liveQ).total;
  const before = summarizePortfolio(s, demoQ).total;
  assert.ok(toLive.body.includes(`$${after.toLocaleString("en-US", { minimumFractionDigits: 2 })}`));
  assert.ok(toLive.body.includes(`$${before.toLocaleString("en-US", { minimumFractionDigits: 2 })}`));
  const toDemo = feedChangeNotice(s, { feed: "live", quotes: liveQ }, { feed: "demo", quotes: demoQ, reason: "unreachable" });
  assert.match(toDemo?.body ?? "", /paused/);
  assert.equal(feedChangeNotice(s, { feed: "live", quotes: liveQ }, { feed: "live", quotes: liveQ }), null);
  assert.equal(feedChangeNotice(s, null, { feed: "live", quotes: liveQ }), null);
});

// ---- Feedback ---------------------------------------------------------------------------

test("feedback validation, fallbacks and context privacy", () => {
  assert.equal(validateFeedbackInput({ type: "bug", message: "hi" }), "Please write a short message.");
  assert.equal(validateFeedbackInput({ type: "bug", message: "x".repeat(2001) })?.includes("2000"), true);
  assert.match(validateFeedbackInput({ type: "idea", message: "Nice app", email: "bad" }) ?? "", /email/);
  assert.equal(validateFeedbackInput({ type: "survey", message: "", rating: 0 }), "Pick a rating from 1 to 5.");
  assert.equal(validateFeedbackInput({ type: "praise", message: "Love it" }), null);

  const s = account();
  const summary = summarizePortfolio(s, [demo("AAPL", 200), demo("MSFT", 400)]);
  const base = { page: "/app/trade", viewport: "390x844", dataSource: "demo", summary };
  assert.equal(buildFeedbackContext({ ...base, includePortfolio: false }).portfolio, undefined);
  assert.match(buildFeedbackContext({ ...base, includePortfolio: true }).portfolio ?? "", /AAPL 6/);

  const input = { type: "bug" as const, message: "Chart is blank\nsecond line", context: buildFeedbackContext({ ...base, includePortfolio: true, userAgent: "UA" }) };
  assert.equal(mailtoLink(input, ""), null); // no address configured → no mailto
  assert.match(mailtoLink(input, "owner@example.com") ?? "", /^mailto:owner@example\.com\?subject=Sentia%20bug/);
  const gh = decodeURIComponent(githubIssueLink(input));
  assert.match(gh, /title=\[bug\] Chart is blank/);
  assert.ok(!gh.includes("AAPL 6"), "public GitHub issues never include the portfolio");
  assert.ok(!gh.includes("userAgent"), "nor the user agent");
});

test("survey shows once, 7 days after first use", () => {
  const now = Date.parse("2026-10-30T12:00:00Z");
  assert.equal(shouldShowSurvey(now - SURVEY_DELAY_MS + 1000, null, now), false);
  assert.equal(shouldShowSurvey(now - SURVEY_DELAY_MS, null, now), true);
  assert.equal(shouldShowSurvey(now - 30 * 86_400_000, "dismissed", now), false);
  assert.equal(shouldShowSurvey(now - 30 * 86_400_000, "done", now), false);
  assert.equal(shouldShowSurvey(null, null, now), false);
});

test("analytics only ever sends a bare page name", () => {
  assert.equal(pageName("/Cursor-/app/trade/?symbol=AAPL", "/Cursor-"), "/app/trade");
  assert.equal(pageName("/app/settings#x", ""), "/app/settings");
  assert.equal(pageName("/Cursor-/", "/Cursor-"), "/");
});

// ---- AI coach context ------------------------------------------------------------------------

test("coach context formats the user's numbers exactly and marks missing data", () => {
  let s = account();
  s = saveProfile(s, { name: "Jane Secret", experience: null, focus: null, avatarColor: "#0d9488" } as Parameters<typeof saveProfile>[1]);
  const quotes = [demo("AAPL", 205.5), demo("MSFT", 410)];
  const summary = summarizePortfolio(s, quotes);
  const ctx = buildCoachContext({ state: s, summary, quotes, now: Date.parse("2026-10-30T15:00:00Z") });

  assert.match(ctx, /Prices: DEMO — simulated/);
  assert.match(ctx, /Total value: \$10,\d{3}\.\d{2}/);
  assert.match(ctx, /- AAPL: 6 sh, avg cost \$200\.00, price \$205\.50, value \$1,233\.00/);
  assert.match(ctx, /- MSFT: 2\.5 sh, avg cost \$400\.00, price \$410\.00, value \$1,025\.00/);
  assert.match(ctx, /SELL 4 AAPL @ \$210\.00, mood: no mood tagged, realized \+\$40\.00/);
  assert.match(ctx, /Realized gain\/loss \(all time\): \+\$40\.00/);
  assert.match(ctx, /DISCIPLINE SCORE: \d+\/100/);
  assert.match(ctx, /THESES \(0\)\nNone written yet\./);
  assert.match(ctx, /PERFORMANCE VS S&P 500 \(SPY\)\nnot available — not enough history/);
  // No hallucination-prone gaps: nothing undefined/NaN, and no personal identifiers.
  assert.ok(!/undefined|NaN|null|Infinity/.test(ctx), ctx);
  assert.ok(!ctx.includes("Jane"), "the profile name is never sent");
  assert.ok(ctx.length <= CONTEXT_MAX_CHARS);
  assert.equal(fmtShares(1234.5678912), "1,234.567891");
});

test("coach context says when a holding has no price and stays under the size cap", () => {
  let s = account();
  for (let i = 0; i < 40; i += 1) s = buy(s, { symbol: `T${String.fromCharCode(65 + (i % 26))}${i}`.slice(0, 5), shares: 1, price: 1 });
  const quotes = [live("AAPL", 205.5)];
  const ctx = buildCoachContext({ state: s, summary: summarizePortfolio(s, quotes), quotes });
  assert.match(ctx, /Prices: real market quotes/);
  assert.match(ctx, /price not available \(valued at cost\)/);
  assert.match(ctx, /smaller holdings not listed/);
  assert.ok(ctx.length <= CONTEXT_MAX_CHARS);
});

// ---- AI coach client + fallback ---------------------------------------------------------------

const streamOf = (parts: string[]) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      for (const p of parts) c.enqueue(new TextEncoder().encode(p));
      c.close();
    },
  });

test("askAiCoach streams text and reports progress", async () => {
  const seen: string[] = [];
  const f = (async () => new Response(streamOf(["Your cash is ", "$1,000.00."]), { status: 200 })) as typeof fetch;
  const text = await askAiCoach("How much cash?", "Cash: $1,000.00", (t) => seen.push(t), { fetchImpl: f });
  assert.equal(text, "Your cash is $1,000.00.");
  assert.deepEqual(seen, ["Your cash is ", "Your cash is $1,000.00."]);
});

test("askAiCoach turns every failure into a CoachFallback (rate limit, outage, timeout, empty)", async () => {
  const cases: [typeof fetch, string][] = [
    [(async () => new Response(JSON.stringify({ error: "Daily AI coach limit reached." }), { status: 429 })) as typeof fetch, "rate-limited"],
    [(async () => new Response("x", { status: 502 })) as typeof fetch, "unavailable"],
    [(async () => new Response("", { status: 503 })) as typeof fetch, "not-configured"],
    [(async () => { throw new TypeError("Failed to fetch"); }) as typeof fetch, "unavailable"],
    [(async () => new Response(streamOf([]), { status: 200 })) as typeof fetch, "unavailable"],
    [
      ((_: RequestInfo | URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))))) as typeof fetch,
      "timeout",
    ],
  ];
  for (const [f, reason] of cases) {
    await assert.rejects(
      askAiCoach("q?", "c", () => undefined, { fetchImpl: f, firstByteMs: 30, totalMs: 60 }),
      (e: unknown) => e instanceof CoachFallback && e.reason === reason,
      reason,
    );
  }
});

test("the built-in fallback still answers from the same numbers", () => {
  const s = account();
  const quotes = [demo("AAPL", 205.5), demo("MSFT", 410)];
  const reply = ruleBasedAnswer("How much cash do I have?", { state: s, summary: summarizePortfolio(s, quotes) });
  assert.equal(reply.intent, "cash");
  assert.match(reply.text, /\$/);
});
