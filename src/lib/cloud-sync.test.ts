import assert from "node:assert/strict";
import { test } from "node:test";
import { cloudStatePath, createDebouncedSaver, fromCloudPayload, isRemoteNewer, toCloudPayload } from "./cloud-sync";
import { buy, createInitialState } from "./storage";

test("cloud state lives at users/{uid}/state/current", () => {
  assert.deepEqual(cloudStatePath("abc"), ["users", "abc", "state", "current"]);
});

test("toCloudPayload strips undefined and round-trips through fromCloudPayload", () => {
  const state = createInitialState();
  state.holdings[0] = { ...state.holdings[0], thesisId: undefined };
  const payload = toCloudPayload(state);
  assert.equal("thesisId" in payload.state.holdings[0], false);
  assert.equal(payload.updatedAt, state.updatedAt);
  const back = fromCloudPayload(payload);
  assert.ok(back);
  assert.equal(back.cash, state.cash);
  assert.equal(back.transactions.length, state.transactions.length);
});

test("fromCloudPayload rejects garbage", () => {
  assert.equal(fromCloudPayload(null), null);
  assert.equal(fromCloudPayload({ state: { version: 99 } }), null);
});

test("isRemoteNewer compares updatedAt", () => {
  const a = createInitialState();
  const b = { ...a, updatedAt: new Date(Date.parse(a.updatedAt) + 1000).toISOString() };
  assert.equal(isRemoteNewer(b, a), true);
  assert.equal(isRemoteNewer(a, b), false);
  assert.equal(isRemoteNewer(a, null), true);
});

test("debounced saver coalesces bursts and flushes the latest value", async () => {
  const saved: number[] = [];
  const saver = createDebouncedSaver<number>(async (v) => {
    saved.push(v);
  }, 20);
  saver.schedule(1);
  saver.schedule(2);
  saver.schedule(3);
  assert.equal(saver.pending(), true);
  await new Promise((r) => setTimeout(r, 60));
  assert.deepEqual(saved, [3]);
  saver.schedule(4);
  await saver.flush();
  assert.deepEqual(saved, [3, 4]);
  assert.equal(saver.pending(), false);
});

test("debounced saver serialises writes and reports errors", async () => {
  const order: string[] = [];
  let errors = 0;
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const saver = createDebouncedSaver<string>(
    async (v) => {
      order.push(`start:${v}`);
      if (v === "a") await gate;
      if (v === "b") throw new Error("nope");
      order.push(`end:${v}`);
    },
    5,
    { onError: () => (errors += 1) },
  );
  saver.schedule("a");
  const first = saver.flush();
  saver.schedule("b");
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(order, ["start:a"]); // b waits for a
  release();
  await first;
  await saver.flush();
  assert.deepEqual(order, ["start:a", "end:a", "start:b"]);
  assert.equal(errors, 1);
});

test("real mutations still produce schema-valid cloud payloads", () => {
  const next = buy(createInitialState(), { symbol: "AAPL", shares: 1, price: 100 });
  assert.ok(fromCloudPayload(toCloudPayload(next)));
});
