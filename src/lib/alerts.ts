// Watchlist + one-shot price alerts (pure; unit-tested).
import { quoteMap, round2 } from "./portfolio";
import { commit, newId, nowIso } from "./storage";
import type { AppState, PriceAlert, Quote } from "./types";
import { isValidSymbol, LIMITS, normalizeSymbol } from "./validation";

// ---- Watchlist ------------------------------------------------------------

export function isWatched(state: AppState, symbol: string): boolean {
  const s = normalizeSymbol(symbol);
  return state.watchlist.some((w) => normalizeSymbol(w) === s);
}

export function toggleWatch(state: AppState, symbol: string): AppState {
  const s = normalizeSymbol(symbol);
  if (!isValidSymbol(s)) throw new Error("Enter a valid ticker symbol.");
  if (isWatched(state, s)) {
    return commit({ ...state, watchlist: state.watchlist.filter((w) => normalizeSymbol(w) !== s) });
  }
  if (state.watchlist.length >= LIMITS.maxWatchlist) {
    throw new Error(`Your watchlist is full (${LIMITS.maxWatchlist} symbols).`);
  }
  return commit({ ...state, watchlist: [...state.watchlist, s] });
}

// ---- Alerts ---------------------------------------------------------------

export type AlertInput = { symbol: string; direction: PriceAlert["direction"]; price: number };

export function addAlert(state: AppState, input: AlertInput): AppState {
  const symbol = normalizeSymbol(input.symbol);
  if (!isValidSymbol(symbol)) throw new Error("Enter a valid ticker symbol.");
  if (!Number.isFinite(input.price) || input.price <= 0 || input.price > LIMITS.maxPrice) {
    throw new Error("Enter a valid alert price.");
  }
  if (state.alerts.length >= LIMITS.maxAlerts) {
    throw new Error(`You can keep up to ${LIMITS.maxAlerts} alerts. Delete some first.`);
  }
  const alert: PriceAlert = {
    id: newId(),
    symbol,
    direction: input.direction,
    price: round2(input.price),
    status: "active",
    createdAt: nowIso(),
  };
  // Alerting on a symbol implies you want to watch it.
  const watchlist =
    isWatched(state, symbol) || state.watchlist.length >= LIMITS.maxWatchlist ? state.watchlist : [...state.watchlist, symbol];
  return commit({ ...state, alerts: [...state.alerts, alert], watchlist });
}

export function removeAlert(state: AppState, id: string): AppState {
  if (!state.alerts.some((a) => a.id === id)) return state;
  return commit({ ...state, alerts: state.alerts.filter((a) => a.id !== id) });
}

export function alertCrossed(alert: Pick<PriceAlert, "direction" | "price">, price: number): boolean {
  if (!Number.isFinite(price) || price <= 0) return false;
  return alert.direction === "above" ? price >= alert.price - 1e-9 : price <= alert.price + 1e-9;
}

export type AlertEvent = { alert: PriceAlert; price: number };

/**
 * Fire each active alert whose condition the latest price meets, exactly once:
 * it is marked "triggered" (with the time and price) so it never fires again.
 * Returns the same state object when nothing fires.
 */
export function checkAlerts(state: AppState, quotes: Quote[]): { state: AppState; events: AlertEvent[] } {
  if (!state.alerts.some((a) => a.status === "active") || quotes.length === 0) return { state, events: [] };
  const prices = quoteMap(quotes);
  const events: AlertEvent[] = [];
  const at = nowIso();
  const alerts = state.alerts.map((alert) => {
    if (alert.status !== "active") return alert;
    const quote = prices.get(normalizeSymbol(alert.symbol));
    if (!quote || !alertCrossed(alert, quote.price)) return alert;
    const fired: PriceAlert = { ...alert, status: "triggered", triggeredAt: at, triggeredPrice: quote.price };
    events.push({ alert: fired, price: quote.price });
    return fired;
  });
  return events.length ? { state: commit({ ...state, alerts }), events } : { state, events };
}
