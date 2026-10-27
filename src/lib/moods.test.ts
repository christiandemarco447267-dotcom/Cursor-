import assert from "node:assert/strict";
import { test } from "node:test";
import { moodExtremes, moodStats } from "./moods";
import type { Transaction } from "./types";

let n = 0;
const at = (h: number) => new Date(Date.parse("2026-10-01T14:00:00Z") + h * 3_600_000).toISOString();
function tx(type: "buy" | "sell", symbol: string, h: number, extra: Partial<Transaction> = {}): Transaction {
  n += 1;
  return { id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`, type, symbol, shares: 1, price: 10, amount: 10, cashAfter: 0, note: "", createdAt: at(h), ...extra };
}

test("moodStats attributes closed trades to the entry mood by default", () => {
  const list = [
    tx("buy", "AAA", 0, { mood: "excited" }),
    tx("sell", "AAA", 1, { realizedGain: -30, mood: "anxious" }),
    tx("buy", "BBB", 0, { mood: "calm" }),
    tx("sell", "BBB", 5, { realizedGain: 50 }),
    tx("buy", "CCC", 0, { mood: "calm" }),
    tx("sell", "CCC", 6, { realizedGain: -10 }),
  ];
  const stats = moodStats(list);
  const by = Object.fromEntries(stats.map((s) => [s.mood, s]));
  assert.equal(by.excited.closed, 1);
  assert.equal(by.excited.realized, -30);
  assert.equal(by.excited.winRate, 0);
  assert.equal(by.calm.closed, 2);
  assert.equal(by.calm.realized, 40);
  assert.equal(by.calm.winRate, 50);
  assert.equal(by.anxious.trades, 1);
  assert.equal(by.anxious.closed, 0);
  assert.equal(by.anxious.winRate, null);

  const exit = Object.fromEntries(moodStats(list, "exit").map((s) => [s.mood, s]));
  assert.equal(exit.anxious.closed, 1);
  assert.equal(exit.calm.closed, 0);

  const { best, worst } = moodExtremes(stats);
  assert.equal(best?.mood, "calm");
  assert.equal(worst?.mood, "excited");
});

test("untagged trades are ignored", () => {
  const stats = moodStats([tx("buy", "AAA", 0), tx("sell", "AAA", 1, { realizedGain: 5 })]);
  assert.equal(stats.reduce((s, m) => s + m.closed + m.trades, 0), 0);
  assert.deepEqual(moodExtremes(stats), { best: null, worst: null });
});
