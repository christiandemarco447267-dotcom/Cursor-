import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addThesis,
  buy,
  createInitialState,
  deposit,
  importStateJson,
  migrateUnknown,
  saveProfile,
  sell,
  withdraw,
} from "./storage";
import { AppStateSchema } from "./types";

test("createInitialState produces a schema-valid, reconciled ledger", () => {
  const state = createInitialState();
  const parsed = AppStateSchema.safeParse(state);
  assert.ok(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues));
  // Cash after seeding equals the last transaction's cashAfter.
  const last = state.transactions[state.transactions.length - 1];
  assert.equal(state.cash, last.cashAfter);
});

test("buy moves cash and appends a transaction", () => {
  const start = createInitialState();
  const next = buy(start, { symbol: "AAPL", shares: 10, price: 100 });
  assert.equal(next.cash, Math.round((start.cash - 1000) * 100) / 100);
  assert.equal(next.transactions[next.transactions.length - 1].type, "buy");
  assert.ok(next.holdings.some((h) => h.symbol === "AAPL"));
});

test("deposit and withdraw adjust cash and guard funds", () => {
  const start = createInitialState();
  const afterDeposit = deposit(start, 1000);
  assert.equal(afterDeposit.cash, Math.round((start.cash + 1000) * 100) / 100);
  assert.throws(() => withdraw(start, start.cash + 1), /Not enough cash/);
});

test("deposit rejects amounts that would exceed the max balance (no state corruption)", () => {
  const start = createInitialState();
  assert.throws(() => deposit(start, 5_000_000_000), /maximum balance/);
  assert.throws(() => deposit(start, -1), /positive/);
});

test("sell realizes P/L into the transaction ledger", () => {
  const bought = buy(createInitialState(), { symbol: "NVDA", shares: 4, price: 100 });
  const sold = sell(bought, { symbol: "NVDA", shares: 4, price: 150 });
  const tx = sold.transactions[sold.transactions.length - 1];
  assert.equal(tx.type, "sell");
  assert.equal(tx.realizedGain, 200);
});

test("addThesis auto-links a matching holding that has no thesis", () => {
  const bought = buy(createInitialState(), { symbol: "AAPL", shares: 1, price: 100 });
  const withThesis = addThesis(bought, { symbol: "AAPL", title: "Quality", rationale: "Durable moat" });
  const holding = withThesis.holdings.find((h) => h.symbol === "AAPL");
  const thesis = withThesis.theses.find((t) => t.symbol === "AAPL");
  assert.ok(thesis);
  assert.equal(holding?.thesisId, thesis?.id);
});

test("migrateUnknown upgrades a v1 state (dropping removed fields) and rejects garbage", () => {
  const v1 = {
    version: 1,
    cash: 1000,
    holdings: [{ id: crypto.randomUUID(), symbol: "VTI", name: "VTI", shares: 1, avgCost: 100, createdAt: "2026-01-01T00:00:00.000Z" }],
    goals: [],
    theses: [],
    checkIns: [],
    lessons: [],
    gamification: { xp: 0, level: 1, streak: 3, lastActiveDate: null, health: "C" },
    investor: { type: "unspecified", answeredAt: null },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  const migrated = migrateUnknown(v1);
  assert.ok(migrated, "v1 should migrate");
  assert.equal(migrated?.version, 3);
  assert.deepEqual(migrated?.orders, []);
  assert.equal(migrated?.holdings.length, 1);
  assert.ok(Array.isArray(migrated?.transactions));
  // Removed features are no longer part of the state shape.
  assert.equal("gamification" in (migrated as object), false);
  assert.equal("goals" in (migrated as object), false);

  assert.equal(migrateUnknown({ nonsense: true }), null);
});

test("saveProfile stores fields and marks setup complete once", () => {
  const start = createInitialState();
  assert.equal(start.profileSetupAt, null);
  const s1 = saveProfile(start, { name: "Alex Doe", experience: "some", focus: "growth", avatarColor: "#2563eb" });
  assert.equal(s1.profileName, "Alex Doe");
  assert.equal(s1.profile.experience, "some");
  assert.equal(s1.profile.focus, "growth");
  assert.equal(s1.profile.avatarColor, "#2563eb");
  assert.ok(s1.profileSetupAt);
  // Later edits keep the original setup timestamp.
  const s2 = saveProfile(s1, { name: "Alex" });
  assert.equal(s2.profileSetupAt, s1.profileSetupAt);
  assert.equal(s2.profileName, "Alex");
  assert.equal(s2.profile.experience, "some");
});

test("importStateJson throws on invalid backups", () => {
  assert.throws(() => importStateJson("{\"not\":\"valid\"}"), /not a valid/);
});

test("migrateUnknown upgrades a saved v2 state, defaulting the new v3 fields", () => {
  const v3 = createInitialState();
  const { watchlist, alerts, orders, snapshots, ...rest } = v3;
  void watchlist;
  void alerts;
  void orders;
  void snapshots;
  const v2 = { ...rest, version: 2 };
  const migrated = migrateUnknown(JSON.parse(JSON.stringify(v2)));
  assert.ok(migrated, "v2 should migrate");
  assert.equal(migrated?.version, 3);
  assert.deepEqual(migrated?.watchlist, []);
  assert.deepEqual(migrated?.alerts, []);
  assert.deepEqual(migrated?.orders, []);
  assert.deepEqual(migrated?.snapshots, []);
  assert.equal(migrated?.cash, v3.cash);
  assert.equal(migrated?.holdings.length, v3.holdings.length);
  assert.equal(migrated?.transactions.length, v3.transactions.length);
});
