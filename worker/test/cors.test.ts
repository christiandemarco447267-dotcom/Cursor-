import { describe, expect, it } from "vitest";
import { handle } from "../src/index";
import { corsHeaders, isAllowedOrigin, NATIVE_APP_ORIGINS } from "../src/http";
import { ctx, jsonRes, makeEnv, mockFetch, PAGES } from "./helpers";

const SAT = Date.UTC(2026, 9, 31, 15, 0, 0);

describe("CORS allowlist", () => {
  it("allows the Capacitor app origins (iOS capacitor://, Android https://localhost, http://localhost)", () => {
    const env = makeEnv();
    for (const origin of ["capacitor://localhost", "https://localhost", "http://localhost"]) {
      expect(isAllowedOrigin(origin, env)).toBe(true);
      expect(corsHeaders(origin, env)["Access-Control-Allow-Origin"]).toBe(origin);
    }
    expect(NATIVE_APP_ORIGINS).toContain("capacitor://localhost");
  });

  it("keeps allowing native origins even when ALLOWED_ORIGINS is customised", () => {
    const env = makeEnv({ ALLOWED_ORIGINS: "https://sentia.example" });
    expect(isAllowedOrigin("https://sentia.example", env)).toBe(true);
    expect(isAllowedOrigin("capacitor://localhost", env)).toBe(true);
    expect(isAllowedOrigin("https://localhost", env)).toBe(true);
    expect(isAllowedOrigin(PAGES, env)).toBe(false);
  });

  it("rejects look-alikes and other schemes", () => {
    const env = makeEnv();
    for (const origin of [
      "capacitor://evil.example",
      "capacitor://localhost.evil.example",
      "https://localhost.evil.example",
      "https://localhost:8443",
      "ionic://localhost",
      "file://",
      "null",
      "https://evil.example",
      "",
    ]) {
      expect(isAllowedOrigin(origin, env)).toBe(false);
      expect(corsHeaders(origin, env)["Access-Control-Allow-Origin"]).toBeUndefined();
    }
    expect(isAllowedOrigin(null, env)).toBe(false);
  });

  it("answers preflight and GET from the iOS app origin", async () => {
    const pre = await handle(
      new Request("https://api.test/quote?symbols=SPY", {
        method: "OPTIONS",
        headers: { Origin: "capacitor://localhost", "Access-Control-Request-Method": "GET" },
      }),
      makeEnv(),
      ctx,
      fetch,
      SAT,
    );
    expect(pre.status).toBe(204);
    expect(pre.headers.get("Access-Control-Allow-Origin")).toBe("capacitor://localhost");

    const { f } = mockFetch([["yahoo.com", () => jsonRes({ chart: { result: [{ meta: { regularMarketPrice: 10, previousClose: 9, regularMarketTime: 1 } }] } })]]);
    const res = await handle(new Request("https://api.test/quote?symbols=SPY", { headers: { Origin: "https://localhost" } }), makeEnv(), ctx, f, SAT);
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://localhost");
  });
});
