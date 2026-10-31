// How a MARKET order is priced (pure; unit-tested).
//
// - With a real quote (live or delayed) the order fills at that quote. Whatever
//   the user typed is only a protective limit: a buy won't fill above it and a
//   sell won't fill below it. Leaving the price empty means "fill at market".
// - On the simulated (demo) feed there is no real market to fill against, so the
//   order fills at the price typed — the long-standing practice behaviour — and
//   the UI says so.
import type { Quote } from "./types";

export type MarketFill =
  | { ok: true; price: number; basis: "live" | "typed" }
  | { ok: false; error: string };

const money = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function resolveMarketFill(side: "buy" | "sell", typedPrice: number | null, quote: Quote | undefined): MarketFill {
  const real = quote && quote.source !== "demo" && quote.price > 0;
  if (real) {
    const price = quote.price;
    if (typedPrice !== null && typedPrice > 0) {
      if (side === "buy" && price > typedPrice + 1e-9) {
        return { ok: false, error: `Not filled: the market price ${money(price)} is above your limit of ${money(typedPrice)}.` };
      }
      if (side === "sell" && price < typedPrice - 1e-9) {
        return { ok: false, error: `Not filled: the market price ${money(price)} is below your limit of ${money(typedPrice)}.` };
      }
    }
    return { ok: true, price, basis: "live" };
  }
  if (typedPrice === null || !(typedPrice > 0)) {
    return { ok: false, error: "Enter a price per share above $0 (prices are simulated, so trades fill at the price you enter)." };
  }
  return { ok: true, price: typedPrice, basis: "typed" };
}
