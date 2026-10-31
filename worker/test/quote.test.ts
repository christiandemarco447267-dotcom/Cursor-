import { beforeEach, describe, expect, it } from "vitest";
import { handle } from "../src/index";
import { cacheTtlMs, clearQuoteCache, clockMarketState, getQuotes, isDelayed, parseSymbols } from "../src/quote";
import { ctx, jsonRes, makeEnv, mockFetch, PAGES } from "./helpers";

// Wed 2026-10-28 14:00 New York (EDT) = 18:00 UTC
const OPEN = Date.parse("2026-10-28T18:00:00Z");
const SAT = Date.parse("2026-10-31T16:00:00Z");

const finnhubOk = (c: number, pc: number, t: number) => jsonRes({ c, d: c - pc, dp: ((c - pc) / pc) * 100, pc, t: Math.floor(t / 1000) });

beforeEach(() => clearQuoteCache());

describe("symbol validation", () => {
  it("accepts and de-duplicates normal tickers", () => {
    expect(parseSymbols("aapl, MSFT,AAPL,brk.b", {})).toEqual({ symbols: ["AAPL", "MSFT", "BRK.B"] });
  });
  it("rejects junk, injection and too many", () => {
    expect("error" in parseSymbols("AAPL;DROP", {})).toBe(true);
    expect("error" in parseSymbols("../etc", {})).toBe(true);
    expect("error" in parseSymbols(null, {})).toBe(true);
    const many = Array.from({ length: 26 }, (_, i) => `A${String.fromCharCode(65 + (i % 26))}${i}`).join(",");
    expect("error" in parseSymbols(many, {})).toBe(true);
  });
  it("honours an optional allowlist", () => {
    expect("error" in parseSymbols("TSLA", { SYMBOL_ALLOWLIST: "AAPL,SPY" })).toBe(true);
    expect(parseSymbols("spy", { SYMBOL_ALLOWLIST: "AAPL,SPY" })).toEqual({ symbols: ["SPY"] });
  });
});

describe("market state + caching", () => {
  it("knows regular hours and weekends from the New York clock", () => {
    expect(clockMarketState(new Date(OPEN))).toBe("open");
    expect(clockMarketState(new Date(SAT))).toBe("closed");
    expect(clockMarketState(new Date("2026-10-28T12:00:00Z"))).toBe("pre"); // 8:00 ET
    expect(clockMarketState(new Date("2026-10-28T21:00:00Z"))).toBe("post"); // 17:00 ET
  });
  it("caches ~15s while open and longer when closed", () => {
    expect(cacheTtlMs("open")).toBe(15_000);
    expect(cacheTtlMs("closed")).toBeGreaterThan(60_000);
  });
  it("labels the fallback source and stale live prices as delayed", () => {
    expect(isDelayed("yahoo", OPEN, "open", OPEN)).toBe(true);
    expect(isDelayed("finnhub", OPEN - 60_000, "open", OPEN)).toBe(false);
    expect(isDelayed("finnhub", OPEN - 30 * 60_000, "open", OPEN)).toBe(true);
    expect(isDelayed("finnhub", OPEN - 3 * 86_400_000, "closed", OPEN)).toBe(false);
  });
});

describe("getQuotes", () => {
  it("uses Finnhub with the key in a header (never in the URL)", async () => {
    const { f, calls } = mockFetch([
      ["market-status", () => jsonRes({ isOpen: true, session: "regular" })],
      ["finnhub.io/api/v1/quote", () => finnhubOk(214.5, 210, OPEN - 5_000)],
    ]);
    const res = await getQuotes(["AAPL"], makeEnv({ FINNHUB_API_KEY: "secret-key" }), f, OPEN);
    expect(res.marketState).toBe("open");
    expect(res.marketStateSource).toBe("finnhub");
    expect(res.quotes[0]).toMatchObject({ symbol: "AAPL", price: 214.5, previousClose: 210, change: 4.5, changePercent: 2.14, source: "finnhub", delayed: false });
    expect(calls.every((c) => !c.url.includes("secret-key"))).toBe(true);
  });

  it("falls back to Yahoo when Finnhub has no data, and reports failures instead of inventing prices", async () => {
    const { f } = mockFetch([
      ["market-status", () => jsonRes({ isOpen: true })],
      ["finnhub.io/api/v1/quote?symbol=AAPL", () => jsonRes({ c: 0, pc: 0, t: 0 })],
      ["finnhub.io/api/v1/quote?symbol=ZZZZ", () => jsonRes({}, 500)],
      ["yahoo.com/v8/finance/chart/AAPL", () => jsonRes({ chart: { result: [{ meta: { regularMarketPrice: 200, previousClose: 205, regularMarketTime: Math.floor(OPEN / 1000) } }] } })],
      ["yahoo.com/v8/finance/chart/ZZZZ", () => jsonRes({ chart: { result: null } }, 404)],
    ]);
    const res = await getQuotes(["AAPL", "ZZZZ"], makeEnv({ FINNHUB_API_KEY: "k" }), f, OPEN);
    expect(res.quotes).toHaveLength(1);
    expect(res.quotes[0]).toMatchObject({ symbol: "AAPL", source: "yahoo", delayed: true, change: -5, changePercent: -2.44 });
    expect(res.errors.map((e) => e.symbol)).toEqual(["ZZZZ"]);
  });

  it("works with no Finnhub key (Yahoo only, clock-based market state)", async () => {
    const { f, calls } = mockFetch([
      ["yahoo.com", () => jsonRes({ chart: { result: [{ meta: { regularMarketPrice: 10, chartPreviousClose: 9, regularMarketTime: Math.floor(SAT / 1000) } }] } })],
    ]);
    const res = await getQuotes(["SPY"], makeEnv(), f, SAT);
    expect(res.marketStateSource).toBe("clock");
    expect(res.marketState).toBe("closed");
    expect(res.quotes[0]?.source).toBe("yahoo");
    expect(calls.some((c) => c.url.includes("finnhub"))).toBe(false);
  });

  it("serves repeat requests from cache within the TTL", async () => {
    const { f, calls } = mockFetch([
      ["market-status", () => jsonRes({ isOpen: true })],
      ["finnhub.io/api/v1/quote", () => finnhubOk(100, 99, OPEN)],
    ]);
    const env = makeEnv({ FINNHUB_API_KEY: "k" });
    await getQuotes(["MSFT"], env, f, OPEN);
    await getQuotes(["MSFT"], env, f, OPEN + 10_000);
    expect(calls.filter((c) => c.url.includes("/quote")).length).toBe(1);
    await getQuotes(["MSFT"], env, f, OPEN + 16_000);
    expect(calls.filter((c) => c.url.includes("/quote")).length).toBe(2);
  });
});

describe("Finnhub free-plan budget", () => {
  it("backs off to Yahoo for a minute after a 429 and caps calls per minute", async () => {
    const yahoo = () => jsonRes({ chart: { result: [{ meta: { regularMarketPrice: 10, previousClose: 9, regularMarketTime: Math.floor(OPEN / 1000) } }] } });
    const { f, calls } = mockFetch([
      ["market-status", () => jsonRes({ isOpen: true })],
      ["finnhub.io/api/v1/quote", () => jsonRes({ error: "limit" }, 429)],
      ["yahoo.com", yahoo],
    ]);
    const env = makeEnv({ FINNHUB_API_KEY: "k" });
    const first = await getQuotes(["AAPL"], env, f, OPEN);
    expect(first.quotes[0]?.source).toBe("yahoo");
    const before = calls.filter((c) => c.url.includes("finnhub.io/api/v1/quote")).length;
    await getQuotes(["MSFT"], env, f, OPEN + 30_000);
    expect(calls.filter((c) => c.url.includes("finnhub.io/api/v1/quote")).length).toBe(before);

    clearQuoteCache();
    const ok = mockFetch([
      ["market-status", () => jsonRes({ isOpen: true })],
      ["finnhub.io/api/v1/quote", () => finnhubOk(10, 9, OPEN)],
      ["yahoo.com", yahoo],
    ]);
    const many = Array.from({ length: 60 }, (_, i) => `S${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + Math.floor(i / 26))}`);
    await getQuotes(many.slice(0, 25), env, ok.f, OPEN);
    await getQuotes(many.slice(25, 50), env, ok.f, OPEN + 1000);
    await getQuotes(many.slice(50), env, ok.f, OPEN + 2000);
    expect(ok.calls.filter((c) => c.url.includes("finnhub.io/api/v1/quote")).length).toBe(50);
  });
});

describe("/quote route", () => {
  it("returns CORS headers for the Pages origin and localhost only", async () => {
    const { f } = mockFetch([["yahoo.com", () => jsonRes({ chart: { result: [{ meta: { regularMarketPrice: 10, previousClose: 9, regularMarketTime: 1 } }] } })]]);
    const ok = await handle(new Request("https://api.test/quote?symbols=SPY", { headers: { Origin: PAGES } }), makeEnv(), ctx, f, SAT);
    expect(ok.status).toBe(200);
    expect(ok.headers.get("Access-Control-Allow-Origin")).toBe(PAGES);
    const local = await handle(new Request("https://api.test/quote?symbols=SPY", { headers: { Origin: "http://localhost:3000" } }), makeEnv(), ctx, f, SAT);
    expect(local.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
    const evil = await handle(new Request("https://api.test/quote?symbols=SPY", { headers: { Origin: "https://evil.example" } }), makeEnv(), ctx, f, SAT);
    expect(evil.status).toBe(403);
    expect(evil.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("rejects bad symbols with 400", async () => {
    const res = await handle(new Request("https://api.test/quote?symbols=<script>"), makeEnv(), ctx, fetch, SAT);
    expect(res.status).toBe(400);
  });

  it("rate-limits a single IP", async () => {
    const { f } = mockFetch([["yahoo.com", () => jsonRes({ chart: { result: [{ meta: { regularMarketPrice: 10, previousClose: 9, regularMarketTime: 1 } }] } })]]);
    let last = 200;
    for (let i = 0; i < 65; i += 1) {
      const r = await handle(new Request("https://api.test/quote?symbols=SPY", { headers: { "CF-Connecting-IP": "9.9.9.9" } }), makeEnv(), ctx, f, SAT + 1);
      last = r.status;
    }
    expect(last).toBe(429);
  });
});
