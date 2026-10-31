import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import vm from "node:vm";

// Load public/sw.js in a sandbox (no real service-worker globals) and pull out its pure router.
type Classify = (req: { url: string; method: string; mode?: string }, scope: string) => "page" | "asset" | "bypass";
function loadClassifier(): Classify {
  const code = readFileSync(path.join(process.cwd(), "public", "sw.js"), "utf8");
  const sandbox = {
    module: { exports: {} as { classifyRequest?: Classify } },
    self: { location: { href: "https://example.test/sw.js" }, addEventListener: () => undefined },
    URL,
  };
  vm.runInNewContext(code, sandbox);
  const fn = sandbox.module.exports.classifyRequest;
  assert.ok(fn, "classifyRequest export");
  return fn;
}

const classify = loadClassifier();
const PAGES = "https://christiandemarco447267-dotcom.github.io/Cursor-/";
const ROOT = "https://sentia.example/";

describe("service worker routing", () => {
  it("serves page navigations network-first under both base paths", () => {
    assert.equal(classify({ url: `${PAGES}app/trade/`, method: "GET", mode: "navigate" }, PAGES), "page");
    assert.equal(classify({ url: `${ROOT}app/`, method: "GET", mode: "navigate" }, ROOT), "page");
  });

  it("caches static app-shell assets", () => {
    assert.equal(classify({ url: `${PAGES}_next/static/chunks/main-abc.js`, method: "GET" }, PAGES), "asset");
    assert.equal(classify({ url: `${ROOT}icons/icon-192.png`, method: "GET" }, ROOT), "asset");
    assert.equal(classify({ url: `${ROOT}manifest.webmanifest`, method: "GET" }, ROOT), "asset");
  });

  it("never caches API traffic: quotes, coach, feedback, events (other origin) or /api routes", () => {
    for (const p of ["quote?symbols=SPY", "coach", "feedback", "events"]) {
      assert.equal(classify({ url: `https://sentia-api.example.workers.dev/${p}`, method: "GET" }, ROOT), "bypass");
      assert.equal(classify({ url: `https://sentia-api.example.workers.dev/${p}`, method: "POST" }, ROOT), "bypass");
    }
    assert.equal(classify({ url: `${ROOT}api/market?symbols=SPY`, method: "GET" }, ROOT), "bypass");
    assert.equal(classify({ url: `${ROOT}api/health`, method: "GET", mode: "navigate" }, ROOT), "bypass");
    assert.equal(classify({ url: `${ROOT}feedback`, method: "POST" }, ROOT), "bypass");
  });

  it("leaves RSC/data requests, out-of-scope paths and the worker itself alone", () => {
    assert.equal(classify({ url: `${ROOT}app/trade/index.txt?_rsc=1x2y`, method: "GET" }, ROOT), "bypass");
    assert.equal(classify({ url: "https://christiandemarco447267-dotcom.github.io/other-repo/app.js", method: "GET" }, PAGES), "bypass");
    assert.equal(classify({ url: `${ROOT}sw.js`, method: "GET" }, ROOT), "bypass");
    assert.equal(classify({ url: "not a url", method: "GET" }, ROOT), "bypass");
  });
});
