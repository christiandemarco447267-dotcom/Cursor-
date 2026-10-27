// Everything that reacts to a price update, in one pure step:
// fill pending orders → fire price alerts → record a performance snapshot.
import { checkAlerts, type AlertEvent } from "./alerts";
import { maybeRecordSnapshot } from "./benchmark";
import { runFillEngine, type FillEvent } from "./orders";
import type { AppState, Quote } from "./types";

export type TickResult = {
  state: AppState;
  changed: boolean;
  fills: FillEvent[];
  alerts: AlertEvent[];
};

export function processMarketTick(state: AppState, quotes: Quote[], now: number = Date.now()): TickResult {
  if (quotes.length === 0) return { state, changed: false, fills: [], alerts: [] };
  const filled = runFillEngine(state, quotes);
  const alerted = checkAlerts(filled.state, quotes);
  const snapped = maybeRecordSnapshot(alerted.state, quotes, now);
  return { state: snapped, changed: snapped !== state, fills: filled.events, alerts: alerted.events };
}
