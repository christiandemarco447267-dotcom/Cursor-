import assert from "node:assert/strict";
import { test } from "node:test";
import { addAlert, alertCrossed, checkAlerts, isWatched, removeAlert, toggleWatch } from "./alerts";
import { createInitialState } from "./storage";
import { AppStateSchema, type Quote } from "./types";

const q = (symbol: string, price: number): Quote => ({ symbol, price, previousClose: price, changePercent: 0, source: "demo" });

test("toggleWatch stars and unstars a ticker", () => {
  const start = createInitialState();
  const starred = toggleWatch(start, "nvda");
  assert.deepEqual(starred.watchlist, ["NVDA"]);
  assert.ok(isWatched(starred, "NVDA"));
  const unstarred = toggleWatch(starred, "NVDA");
  assert.deepEqual(unstarred.watchlist, []);
  assert.throws(() => toggleWatch(start, "123"), /valid/);
});

test("alertCrossed handles above and below", () => {
  assert.equal(alertCrossed({ direction: "above", price: 100 }, 100), true);
  assert.equal(alertCrossed({ direction: "above", price: 100 }, 99.99), false);
  assert.equal(alertCrossed({ direction: "below", price: 100 }, 99), true);
  assert.equal(alertCrossed({ direction: "below", price: 100 }, 101), false);
});

test("an alert fires once when crossed, then is marked triggered", () => {
  const start = addAlert(createInitialState(), { symbol: "AAPL", direction: "above", price: 220 });
  assert.ok(isWatched(start, "AAPL"), "alerting adds the symbol to the watchlist");
  assert.equal(start.alerts[0].status, "active");

  const quiet = checkAlerts(start, [q("AAPL", 215)]);
  assert.equal(quiet.events.length, 0);
  assert.equal(quiet.state, start);

  const fired = checkAlerts(start, [q("AAPL", 221.5)]);
  assert.equal(fired.events.length, 1);
  assert.equal(fired.events[0].price, 221.5);
  assert.equal(fired.state.alerts[0].status, "triggered");
  assert.equal(fired.state.alerts[0].triggeredPrice, 221.5);
  assert.ok(fired.state.alerts[0].triggeredAt);
  assert.ok(AppStateSchema.safeParse(fired.state).success);

  const again = checkAlerts(fired.state, [q("AAPL", 230)]);
  assert.equal(again.events.length, 0, "never fires twice");
});

test("below alerts and deletion", () => {
  let s = addAlert(createInitialState(), { symbol: "MSFT", direction: "below", price: 400 });
  s = addAlert(s, { symbol: "MSFT", direction: "above", price: 500 });
  const { state, events } = checkAlerts(s, [q("MSFT", 390)]);
  assert.equal(events.length, 1);
  assert.equal(events[0].alert.direction, "below");
  assert.equal(state.alerts.filter((a) => a.status === "active").length, 1);
  const removed = removeAlert(state, state.alerts[0].id);
  assert.equal(removed.alerts.length, 1);
  assert.throws(() => addAlert(s, { symbol: "MSFT", direction: "above", price: 0 }), /valid/);
});
