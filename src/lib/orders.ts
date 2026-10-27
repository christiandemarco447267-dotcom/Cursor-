// Pending limit / stop orders and the fill engine (pure; unit-tested).
//
// Orders are validated when placed, but cash and shares are NOT reserved:
// they are re-checked at fill time through the normal buy/sell logic. An order
// that can no longer be honoured is marked "rejected" and a note is written to
// the ledger, so nothing ever happens silently.
import { formatCurrency, formatNumber } from "./format";
import { quoteMap, round2, TradeError } from "./portfolio";
import { buy, commit, newId, nowIso, pushTransaction, sell } from "./storage";
import type { AppState, PendingOrder, Quote, Transaction } from "./types";
import { isValidSymbol, LIMITS, normalizeSymbol } from "./validation";

export type OrderSide = PendingOrder["side"];
export type OrderType = PendingOrder["type"];

export type OrderInput = {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  shares: number;
  triggerPrice: number;
};

/** Human label: "Buy limit", "Sell stop", … */
export function orderLabel(order: Pick<PendingOrder, "side" | "type">): string {
  return `${order.side === "buy" ? "Buy" : "Sell"} ${order.type}`;
}

/** Plain-English trigger condition, e.g. "fills at or below $180.00". */
export function orderCondition(order: Pick<PendingOrder, "side" | "type" | "triggerPrice">): string {
  const price = formatCurrency(order.triggerPrice);
  const below = isTriggerBelow(order);
  if (order.type === "limit") return `fills at ${price} or ${below ? "lower" : "higher"}`;
  return `triggers at ${price} or ${below ? "lower" : "higher"}`;
}

/** Buy-limit and sell-stop wait for the price to fall; sell-limit and buy-stop wait for it to rise. */
function isTriggerBelow(order: Pick<PendingOrder, "side" | "type">): boolean {
  return (order.side === "buy" && order.type === "limit") || (order.side === "sell" && order.type === "stop");
}

/** Is this order marketable at `price`? */
export function shouldFill(order: Pick<PendingOrder, "side" | "type" | "triggerPrice">, price: number): boolean {
  if (!Number.isFinite(price) || price <= 0) return false;
  return isTriggerBelow(order) ? price <= order.triggerPrice + 1e-9 : price >= order.triggerPrice - 1e-9;
}

function pruneOrders(orders: PendingOrder[]): PendingOrder[] {
  if (orders.length <= LIMITS.maxOrders) return orders;
  // Drop the oldest closed orders first; open orders are never pruned.
  const overflow = orders.length - LIMITS.maxOrders;
  let dropped = 0;
  return orders.filter((o) => {
    if (dropped < overflow && o.status !== "open") {
      dropped += 1;
      return false;
    }
    return true;
  });
}

export function placeOrder(state: AppState, input: OrderInput): AppState {
  const symbol = normalizeSymbol(input.symbol);
  if (!isValidSymbol(symbol)) throw new TradeError("Enter a valid ticker symbol.");
  if (!Number.isFinite(input.shares) || input.shares <= 0 || input.shares > LIMITS.maxShares) {
    throw new TradeError("Enter a positive number of shares.");
  }
  if (!Number.isFinite(input.triggerPrice) || input.triggerPrice <= 0 || input.triggerPrice > LIMITS.maxPrice) {
    throw new TradeError(`Enter a valid ${input.type} price.`);
  }
  const open = state.orders.filter((o) => o.status === "open");
  if (open.length >= 50) throw new TradeError("You already have 50 open orders. Cancel some first.");

  if (input.side === "buy") {
    const cost = round2(input.shares * input.triggerPrice);
    if (cost > state.cash + 1e-9) {
      throw new TradeError(
        `Not enough cash. At ${formatCurrency(input.triggerPrice)} this order costs ${formatCurrency(cost)} but only ${formatCurrency(state.cash)} is available.`,
      );
    }
  } else {
    const held = state.holdings.find((h) => normalizeSymbol(h.symbol) === symbol);
    if (!held) throw new TradeError(`You don't hold any ${symbol}.`);
    if (input.shares > held.shares + 1e-9) {
      throw new TradeError(`You only hold ${formatNumber(held.shares)} ${symbol}.`);
    }
  }

  const now = nowIso();
  const order: PendingOrder = {
    id: newId(),
    symbol,
    side: input.side,
    type: input.type,
    shares: input.shares,
    triggerPrice: round2(input.triggerPrice),
    status: "open",
    createdAt: now,
    updatedAt: now,
  };
  return commit({ ...state, orders: pruneOrders([...state.orders, order]) });
}

export function cancelOrder(state: AppState, id: string): AppState {
  const target = state.orders.find((o) => o.id === id);
  if (!target || target.status !== "open") return state;
  const now = nowIso();
  return commit({
    ...state,
    orders: state.orders.map((o) => (o.id === id ? { ...o, status: "cancelled", updatedAt: now } : o)),
  });
}

/** Remove filled / cancelled / rejected orders from the list. */
export function clearClosedOrders(state: AppState): AppState {
  if (!state.orders.some((o) => o.status !== "open")) return state;
  return commit({ ...state, orders: state.orders.filter((o) => o.status === "open") });
}

export type FillEvent =
  | { kind: "filled"; order: PendingOrder; price: number }
  | { kind: "rejected"; order: PendingOrder; price: number; reason: string };

/**
 * Check every open order against the latest quotes and execute the ones whose
 * condition is met, oldest first, through the normal buy/sell logic. Fills are
 * at the current market price (a marketable limit fills at the market, which is
 * at or better than the limit). Returns the same state object when nothing fills.
 */
export function runFillEngine(state: AppState, quotes: Quote[]): { state: AppState; events: FillEvent[] } {
  const open = state.orders.filter((o) => o.status === "open");
  if (open.length === 0 || quotes.length === 0) return { state, events: [] };
  const prices = quoteMap(quotes);
  const events: FillEvent[] = [];
  let next = state;

  const ordered = [...open].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const order of ordered) {
    const quote = prices.get(normalizeSymbol(order.symbol));
    if (!quote || !shouldFill(order, quote.price)) continue;
    const price = quote.price;
    const desc = `${orderLabel(order)} ${formatNumber(order.shares)} ${order.symbol} @ ${formatCurrency(order.triggerPrice)}`;
    try {
      const traded =
        order.side === "buy"
          ? buy(next, { symbol: order.symbol, shares: order.shares, price }, `${desc} filled`)
          : sell(next, { symbol: order.symbol, shares: order.shares, price }, `${desc} filled`);
      const at = nowIso();
      const filled: PendingOrder = { ...order, status: "filled", filledAt: at, fillPrice: price, updatedAt: at };
      next = { ...traded, orders: traded.orders.map((o) => (o.id === order.id ? filled : o)) };
      events.push({ kind: "filled", order: filled, price });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Order could not be filled.";
      const at = nowIso();
      const rejected: PendingOrder = { ...order, status: "rejected", reason: reason.slice(0, 200), updatedAt: at };
      const note: Transaction = {
        id: newId(),
        type: "order",
        symbol: order.symbol,
        shares: order.shares,
        price,
        amount: 0,
        cashAfter: next.cash,
        note: `${desc} rejected: ${reason}`.slice(0, 200),
        createdAt: at,
      };
      next = {
        ...next,
        orders: next.orders.map((o) => (o.id === order.id ? rejected : o)),
        transactions: pushTransaction(next.transactions, note),
      };
      events.push({ kind: "rejected", order: rejected, price, reason });
    }
  }

  return events.length ? { state: commit(next), events } : { state, events };
}
