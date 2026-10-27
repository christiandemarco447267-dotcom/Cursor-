import assert from "node:assert/strict";
import { test } from "node:test";
import { cancelOrder, clearClosedOrders, placeOrder, runFillEngine, shouldFill } from "./orders";
import { createInitialState } from "./storage";
import { AppStateSchema, type Quote } from "./types";

const q = (symbol: string, price: number): Quote => ({
  symbol,
  price,
  previousClose: price,
  changePercent: 0,
  source: "demo",
});

test("shouldFill covers buy-limit, sell-limit, sell-stop and buy-stop", () => {
  assert.equal(shouldFill({ side: "buy", type: "limit", triggerPrice: 100 }, 99.5), true);
  assert.equal(shouldFill({ side: "buy", type: "limit", triggerPrice: 100 }, 100.5), false);
  assert.equal(shouldFill({ side: "sell", type: "limit", triggerPrice: 100 }, 101), true);
  assert.equal(shouldFill({ side: "sell", type: "limit", triggerPrice: 100 }, 99), false);
  assert.equal(shouldFill({ side: "sell", type: "stop", triggerPrice: 100 }, 98), true);
  assert.equal(shouldFill({ side: "sell", type: "stop", triggerPrice: 100 }, 102), false);
  assert.equal(shouldFill({ side: "buy", type: "stop", triggerPrice: 100 }, 100), true);
  assert.equal(shouldFill({ side: "buy", type: "stop", triggerPrice: 100 }, 99), false);
  assert.equal(shouldFill({ side: "buy", type: "limit", triggerPrice: 100 }, NaN), false);
});

test("a buy limit waits, then fills at the market price through the normal buy logic", () => {
  const start = placeOrder(createInitialState(), { symbol: "aapl", side: "buy", type: "limit", shares: 10, triggerPrice: 200 });
  assert.equal(start.orders.length, 1);
  assert.equal(start.orders[0].symbol, "AAPL");

  const idle = runFillEngine(start, [q("AAPL", 210)]);
  assert.equal(idle.state, start, "no fill above the limit");
  assert.equal(idle.events.length, 0);

  const { state, events } = runFillEngine(start, [q("AAPL", 195)]);
  assert.equal(events.length, 1);
  assert.equal(events[0].kind, "filled");
  const order = state.orders[0];
  assert.equal(order.status, "filled");
  assert.equal(order.fillPrice, 195);
  assert.equal(state.cash, Math.round((start.cash - 1950) * 100) / 100);
  const holding = state.holdings.find((h) => h.symbol === "AAPL");
  assert.equal(holding?.shares, 10);
  const tx = state.transactions[state.transactions.length - 1];
  assert.equal(tx.type, "buy");
  assert.match(tx.note, /Buy limit .* filled/);
  assert.ok(AppStateSchema.safeParse(state).success);

  // Filled orders never fill twice.
  const again = runFillEngine(state, [q("AAPL", 150)]);
  assert.equal(again.events.length, 0);
});

test("a sell stop triggers on a drop and realizes P/L", () => {
  const start = createInitialState(); // holds 42 VTI @ 245.50
  const placed = placeOrder(start, { symbol: "VTI", side: "sell", type: "stop", shares: 42, triggerPrice: 240 });
  const { state, events } = runFillEngine(placed, [q("VTI", 238)]);
  assert.equal(events[0].kind, "filled");
  assert.equal(state.holdings.some((h) => h.symbol === "VTI"), false);
  const tx = state.transactions[state.transactions.length - 1];
  assert.equal(tx.type, "sell");
  assert.equal(tx.realizedGain, Math.round((238 - 245.5) * 42 * 100) / 100);
});

test("insufficient cash at fill time rejects the order with a ledger note", () => {
  const start = createInitialState();
  const cash = start.cash;
  // Two buy limits that each fit, but not both.
  const shares = Math.floor(cash / 100 / 2) + 10;
  let s = placeOrder(start, { symbol: "MSFT", side: "buy", type: "limit", shares, triggerPrice: 100 });
  s = placeOrder(s, { symbol: "NVDA", side: "buy", type: "limit", shares, triggerPrice: 100 });
  const { state, events } = runFillEngine(s, [q("MSFT", 100), q("NVDA", 100)]);
  assert.deepEqual(
    events.map((e) => e.kind),
    ["filled", "rejected"],
  );
  const rejected = state.orders.find((o) => o.symbol === "NVDA");
  assert.equal(rejected?.status, "rejected");
  assert.match(rejected?.reason ?? "", /Not enough cash/);
  const note = state.transactions[state.transactions.length - 1];
  assert.equal(note.type, "order");
  assert.equal(note.amount, 0);
  assert.match(note.note, /rejected/);
  assert.ok(state.cash >= 0);
  assert.ok(AppStateSchema.safeParse(state).success);
});

test("a sell order is rejected at fill time if the shares were sold in the meantime", () => {
  const start = createInitialState();
  const placed = placeOrder(start, { symbol: "BND", side: "sell", type: "limit", shares: 40, triggerPrice: 80 });
  const soldElsewhere = { ...placed, holdings: placed.holdings.filter((h) => h.symbol !== "BND") };
  const { state, events } = runFillEngine(soldElsewhere, [q("BND", 81)]);
  assert.equal(events[0].kind, "rejected");
  assert.equal(state.orders[0].status, "rejected");
});

test("placeOrder validates inputs; cancel and clear manage the list", () => {
  const start = createInitialState();
  assert.throws(() => placeOrder(start, { symbol: "AAPL", side: "buy", type: "limit", shares: 0, triggerPrice: 10 }), /positive/);
  assert.throws(() => placeOrder(start, { symbol: "AAPL", side: "buy", type: "limit", shares: 1, triggerPrice: -1 }), /valid/);
  assert.throws(() => placeOrder(start, { symbol: "AAPL", side: "sell", type: "limit", shares: 1, triggerPrice: 10 }), /don't hold/);
  assert.throws(() => placeOrder(start, { symbol: "VTI", side: "sell", type: "stop", shares: 999, triggerPrice: 10 }), /only hold/);
  assert.throws(
    () => placeOrder(start, { symbol: "AAPL", side: "buy", type: "stop", shares: 1_000_000, triggerPrice: 100 }),
    /Not enough cash/,
  );

  const placed = placeOrder(start, { symbol: "AAPL", side: "buy", type: "stop", shares: 1, triggerPrice: 300 });
  const cancelled = cancelOrder(placed, placed.orders[0].id);
  assert.equal(cancelled.orders[0].status, "cancelled");
  assert.equal(runFillEngine(cancelled, [q("AAPL", 400)]).events.length, 0, "cancelled orders never fill");
  assert.equal(clearClosedOrders(cancelled).orders.length, 0);
});
