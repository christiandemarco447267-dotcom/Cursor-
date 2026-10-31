import type { Env } from "../src/env";

/** Minimal in-memory KV with the subset of the API the Worker uses. */
export class FakeKV {
  store = new Map<string, string>();
  writes = 0;
  async get(key: string, type?: "json"): Promise<unknown> {
    const v = this.store.get(key);
    if (v === undefined) return null;
    return type === "json" ? JSON.parse(v) : v;
  }
  async put(key: string, value: string): Promise<void> {
    this.writes += 1;
    this.store.set(key, value);
  }
  async list({ prefix = "", limit = 1000 }: { prefix?: string; limit?: number; cursor?: string }) {
    const keys = [...this.store.keys()].filter((k) => k.startsWith(prefix)).sort().slice(0, limit).map((name) => ({ name }));
    return { keys, list_complete: true, cursor: "" };
  }
}

export function makeEnv(overrides: Partial<Env> = {}, kv: FakeKV | null = new FakeKV()): Env {
  return { ...(kv ? { SENTIA_KV: kv as unknown as KVNamespace } : {}), ...overrides };
}

export const ctx = { waitUntil: (p: Promise<unknown>) => void p.catch(() => undefined) };

export type Route = (url: string, init?: RequestInit) => Response | Promise<Response>;

/** A fetch mock that routes by URL substring and records calls. */
export function mockFetch(routes: [string, Route][]) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const f = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    calls.push({ url, init });
    for (const [match, route] of routes) if (url.includes(match)) return route(url, init);
    return new Response("not mocked", { status: 599 });
  }) as typeof fetch;
  return { f, calls };
}

export const jsonRes = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export function sseStream(lines: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      // Split mid-line on purpose to exercise buffering.
      const all = lines.join("\n") + "\n";
      const mid = Math.floor(all.length / 2);
      c.enqueue(enc.encode(all.slice(0, mid)));
      c.enqueue(enc.encode(all.slice(mid)));
      c.close();
    },
  });
}

export const PAGES = "https://christiandemarco447267-dotcom.github.io";
