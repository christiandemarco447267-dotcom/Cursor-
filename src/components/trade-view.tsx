"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Clock3, Lightbulb, X } from "lucide-react";
import { previewTradeBiases } from "@/lib/biases";
import { MOOD_INFO } from "@/lib/moods";
import { MOODS, type Mood } from "@/lib/types";
import { ShareTradeButton } from "./share-card";
import { formatCurrency, formatNumber, formatRelativeDay } from "@/lib/format";
import { track } from "@/lib/analytics";
import { formatAsOfET } from "@/lib/live-quotes";
import { DEMO_UNIVERSE, demoQuote, nameForSymbol, priceSourceOf } from "@/lib/market";
import { resolveMarketFill } from "@/lib/market-fill";
import { orderCondition, orderLabel } from "@/lib/orders";
import { quoteMap } from "@/lib/portfolio";
import { useApp } from "@/lib/store";
import { isValidSymbol, normalizeSymbol, parseAmount } from "@/lib/validation";
import type { PendingOrder } from "@/lib/types";
import { EmptyState, Loading, Panel, PageHeader, QuoteBadge, StarButton } from "./ui";

type Mode = "buy" | "sell";
type OrderKind = "market" | "limit" | "stop";

const ORDER_KINDS: { key: OrderKind; label: string }[] = [
  { key: "market", label: "Market" },
  { key: "limit", label: "Limit" },
  { key: "stop", label: "Stop" },
];

/** One-line explanation of what the selected order does. */
function orderHelp(mode: Mode, kind: OrderKind, live: boolean): string {
  if (kind === "market") {
    if (live) {
      return mode === "buy"
        ? "Buys now at the live market price. The price box is optional — set it as a limit and the order won't fill above it."
        : "Sells now at the live market price. The price box is optional — set it as a limit and the order won't fill below it.";
    }
    return mode === "buy" ? "Buys now at the price you enter (prices are simulated)." : "Sells now at the price you enter (prices are simulated).";
  }
  if (kind === "limit") {
    return mode === "buy"
      ? "Buy limit: waits, then buys once the price falls to your limit or lower."
      : "Sell limit: waits, then sells once the price rises to your limit or higher.";
  }
  return mode === "buy"
    ? "Buy stop: waits, then buys once the price rises to your stop or higher (e.g. to catch a breakout)."
    : "Sell stop: waits, then sells once the price falls to your stop or lower (a stop-loss).";
}

export function TradeView() {
  const { ready, state, quotes, market, actions } = useApp();
  const searchParams = useSearchParams();
  const initialSymbol = searchParams.get("symbol") ?? "";

  const [mode, setMode] = useState<Mode>("buy");
  const [kind, setKind] = useState<OrderKind>("market");
  const [symbol, setSymbol] = useState(initialSymbol.toUpperCase());
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mood, setMood] = useState<Mood | undefined>(undefined);

  const prices = useMemo(() => quoteMap(quotes), [quotes]);

  if (!ready || !state) return <Loading />;

  const normalized = normalizeSymbol(symbol);
  // On the simulated feed every ticker gets a deterministic demo price. A symbol the
  // feed isn't quoting yet (e.g. a new ticker typed here) gets the same demo quote it
  // will be valued at once held, so the "use market price" shortcut always matches.
  const simulatedFeed = priceSourceOf(market) === "demo";
  const liveFeed = market.feed === "live";
  const quote = prices.get(normalized) ?? (simulatedFeed && isValidSymbol(normalized) ? demoQuote(normalized) : undefined);
  // On the live feed a market order needs a real quote for this symbol; it never falls back to a typed or simulated price.
  const liveQuote = quote && quote.source !== "demo" ? quote : undefined;
  const liveMarket = kind === "market" && liveFeed;
  const held = state.holdings.find((h) => h.symbol.toUpperCase() === normalized);
  const sharesNum = parseAmount(shares);
  const priceNum = parseAmount(price);
  // Price the order would execute at: the live quote for live market orders, otherwise the typed price.
  const execPrice = liveMarket ? (liveQuote?.price ?? null) : priceNum;
  const estimated = sharesNum !== null && execPrice !== null ? sharesNum * execPrice : null;
  // Demo market orders execute at the price entered; flag one far from the current quote.
  const deviationPct =
    kind === "market" && !liveFeed && quote && priceNum !== null && priceNum > 0 ? ((priceNum - quote.price) / quote.price) * 100 : null;
  const liveFill = liveMarket && liveQuote ? resolveMarketFill(mode, priceNum, liveQuote) : null;
  const farFromMarket = deviationPct !== null && Math.abs(deviationPct) >= 5;

  // Bias Radar nudges for the trade being typed (gentle, never blocking).
  const nudges =
    kind === "market" && isValidSymbol(normalized) && sharesNum !== null && sharesNum > 0 && execPrice !== null && execPrice > 0
      ? previewTradeBiases(state.transactions, {
          side: mode,
          symbol: normalized,
          shares: sharesNum,
          price: execPrice,
          dayChange: quote?.changePercent,
          avgCost: held?.avgCost,
        })
      : [];

  const useMarketPrice = () => {
    if (quote) setPrice(String(quote.price));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!isValidSymbol(symbol)) {
      setError("Enter a valid ticker symbol (letters, up to 12 chars).");
      return;
    }
    if (sharesNum === null || sharesNum <= 0) {
      setError("Enter a positive number of shares.");
      return;
    }
    if (price.trim() && (priceNum === null || priceNum <= 0)) {
      setError(liveMarket ? "Enter a limit price above $0, or leave it empty to fill at the market." : "Enter a price per share above $0.");
      return;
    }
    if (!liveMarket && (priceNum === null || priceNum <= 0)) {
      setError(kind === "market" ? "Enter a price per share above $0." : `Enter a ${kind} price above $0.`);
      return;
    }

    if (kind !== "market" && priceNum !== null) {
      try {
        actions.placeOrder({ symbol: normalized, side: mode, type: kind, shares: sharesNum, triggerPrice: priceNum });
        setNotice(
          `${orderLabel({ side: mode, type: kind })} order placed: ${formatNumber(sharesNum)} ${normalized}, ${orderCondition({ side: mode, type: kind, triggerPrice: priceNum })}.`,
        );
        track("trade_placed");
        setShares("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Order could not be placed.");
      }
      return;
    }

    if (liveMarket && !liveQuote) {
      setError(`No live price for ${normalized} right now, so a market order can't fill. Try again shortly or place a limit order.`);
      return;
    }
    const fill = resolveMarketFill(mode, priceNum, liveMarket ? liveQuote : undefined);
    if (!fill.ok) {
      setError(fill.error);
      return;
    }
    const at = fill.basis === "live" ? ` (live price${liveQuote?.asOf ? `, as of ${formatAsOfET(liveQuote.asOf)}` : ""})` : "";

    try {
      const meta = { mood, dayChange: quote?.changePercent };
      if (mode === "buy") {
        actions.buy({ symbol: normalized, shares: sharesNum, price: fill.price, ...meta });
        setNotice(`Bought ${formatNumber(sharesNum)} ${normalized} at ${formatCurrency(fill.price)}${at}.`);
      } else {
        actions.sell({ symbol: normalized, shares: sharesNum, price: fill.price, ...meta });
        setNotice(`Sold ${formatNumber(sharesNum)} ${normalized} at ${formatCurrency(fill.price)}${at}.`);
      }
      track("trade_placed");
      setShares("");
      setMood(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trade could not be completed.");
    }
  };

  const recent = [...state.transactions].slice(-8).reverse();
  const openOrders = state.orders.filter((o) => o.status === "open").reverse();
  const closedOrders = state.orders.filter((o) => o.status !== "open").slice(-6).reverse();
  const priceLabel = liveMarket ? "Limit price (optional)" : kind === "market" ? "Price / share" : kind === "limit" ? "Limit price" : "Stop price";

  return (
    <div className="stack gap-lg animate-in">
      <PageHeader title="Trade" subtitle="Simulated buy & sell. Cash moves, cost basis averages, gains realize on sale." />

      <div className="grid grid-2">
        <Panel strong className="stack gap-md">
          <div className="row gap-sm" role="group" aria-label="Order side">
            <button
              type="button"
              className={`btn btn-sm ${mode === "buy" ? "btn-primary" : ""}`}
              onClick={() => setMode("buy")}
              aria-pressed={mode === "buy"}
            >
              <ArrowUpRight size={15} /> Buy
            </button>
            <button
              type="button"
              className={`btn btn-sm ${mode === "sell" ? "btn-primary" : ""}`}
              onClick={() => setMode("sell")}
              aria-pressed={mode === "sell"}
            >
              <ArrowDownLeft size={15} /> Sell
            </button>
            <span className="grow" />
            <span className="pill">Cash {formatCurrency(state.cash)}</span>
          </div>

          <div className="segmented" role="group" aria-label="Order type">
            {ORDER_KINDS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={kind === option.key ? "active" : ""}
                onClick={() => setKind(option.key)}
                aria-pressed={kind === option.key}
              >
                {option.label}
              </button>
            ))}
          </div>
          <span className="small muted" style={{ marginTop: -6 }}>
            {orderHelp(mode, kind, liveFeed)}
          </span>

          <form className="stack gap-md" onSubmit={submit}>
            <div className="field">
              <label htmlFor="symbol">Symbol</label>
              <div className="row gap-sm">
              <input
                id="symbol"
                className="input"
                list="symbol-options"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. AAPL"
                maxLength={12}
                autoComplete="off"
                aria-describedby={normalized ? "symbol-name" : undefined}
              />
              {isValidSymbol(normalized) ? <StarButton symbol={normalized} /> : null}
              </div>
              <datalist id="symbol-options">
                {DEMO_UNIVERSE.map((entry) => (
                  <option key={entry.symbol} value={entry.symbol}>
                    {entry.name}
                  </option>
                ))}
              </datalist>
              {normalized ? (
                <span id="symbol-name" className="small dim row wrap gap-sm">
                  {nameForSymbol(normalized)}
                  {isValidSymbol(normalized) ? <QuoteBadge quote={quote} showTime /> : null}
                  {liveFeed && isValidSymbol(normalized) && !liveQuote ? <span className="loss">No live price yet</span> : null}
                </span>
              ) : null}
            </div>

            <div className="grid grid-2">
              <div className="field">
                <label htmlFor="shares">Shares</label>
                <input
                  id="shares"
                  className="input"
                  inputMode="decimal"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  placeholder="0"
                />
                {mode === "sell" && held ? (
                  <button type="button" className="small dim" style={{ textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0 }} onClick={() => setShares(String(held.shares))}>
                    You hold {formatNumber(held.shares)} — sell all
                  </button>
                ) : null}
              </div>
              <div className="field">
                <label htmlFor="price">{priceLabel}</label>
                <input
                  id="price"
                  className="input"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={liveMarket ? "Market" : "0.00"}
                />
                {quote ? (
                  <button type="button" className="small dim" style={{ textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0 }} onClick={useMarketPrice}>
                    Market {formatCurrency(quote.price)}{liveMarket ? " — set as limit" : kind === "market" ? " — use it" : " — start from it"}
                  </button>
                ) : null}
              </div>
            </div>

            {estimated !== null ? (
              <div className="row between">
                <span className="muted small">
                  {liveMarket ? "At the live price, est." : kind === "market" ? "Estimated" : `At your ${kind} price, est.`} {mode === "buy" ? "cost" : "proceeds"}
                </span>
                <strong>{formatCurrency(estimated)}</strong>
              </div>
            ) : null}

            {liveFill && !liveFill.ok ? (
              <div className="nudge small" role="note">
                <Lightbulb size={16} />
                <span>{liveFill.error} Clear the price to fill at the market.</span>
              </div>
            ) : null}

            {farFromMarket && quote && deviationPct !== null ? (
              <div className="nudge small" role="note">
                <Lightbulb size={16} />
                <span>
                  <strong>Check the price.</strong> {formatCurrency(priceNum ?? 0)} is {Math.abs(deviationPct).toFixed(0)}%{" "}
                  {deviationPct > 0 ? "above" : "below"} the market ({formatCurrency(quote.price)}). Paper trades fill at the
                  price you enter, so this would {mode === "buy" ? (deviationPct > 0 ? "start you at a loss" : "book an instant paper gain") : deviationPct > 0 ? "book a gain the market isn't offering" : "sell below what the market pays"}.{" "}
                  <button type="button" className="link-btn" onClick={useMarketPrice}>
                    Use {formatCurrency(quote.price)}
                  </button>
                </span>
              </div>
            ) : null}

            {kind === "market" ? (
              <div className="field">
                <span id="mood-label" className="small muted">
                  How are you feeling? <span className="dim">(optional)</span>
                </span>
                <div className="mood-row" role="group" aria-labelledby="mood-label">
                  {MOODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className="mood-pick"
                      aria-pressed={mood === m}
                      onClick={() => setMood((cur) => (cur === m ? undefined : m))}
                    >
                      <span aria-hidden="true">{MOOD_INFO[m].emoji}</span> {MOOD_INFO[m].label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {nudges.length ? (
              <div className="stack gap-sm" aria-live="polite">
                {nudges.map((n) => (
                  <div key={n.bias} className="nudge small" role="note">
                    <Lightbulb size={16} />
                    <span>
                      <strong>Bias check: {n.title}.</strong> {n.body}
                    </span>
                  </div>
                ))}
                <span className="small dim">Just a nudge — you can still place this trade. Educational only, not advice.</span>
              </div>
            ) : null}

            <div aria-live="polite" className="stack gap-sm">
              {error ? (
                <span className="form-error" role="alert">
                  {error}
                </span>
              ) : null}
              {notice ? <span className="form-ok">{notice}</span> : null}
            </div>

            <button type="submit" className="btn btn-primary btn-block">
              {kind === "market"
                ? mode === "buy"
                  ? "Buy shares"
                  : "Sell shares"
                : `Place ${orderLabel({ side: mode, type: kind }).toLowerCase()} order`}
            </button>
          </form>
        </Panel>

        <Panel className="stack gap-md">
          <strong>Recent activity</strong>
          {recent.length === 0 ? (
            <EmptyState title="No transactions yet" />
          ) : (
            <div className="list">
              {recent.map((tx) => (
                <div key={tx.id} className="list-row">
                  <span className="sym-badge" style={{ textTransform: "capitalize", fontSize: 11 }}>
                    {tx.type}
                  </span>
                  <div className="grow stack" style={{ gap: 2 }}>
                    <div className="row between">
                      <strong>
                        {tx.symbol ?? "Cash"}
                        {tx.type !== "order" && tx.shares && tx.price ? ` · ${formatNumber(tx.shares)} @ ${formatCurrency(tx.price)}` : ""}
                      </strong>
                      {tx.type === "order" ? (
                        <span className="small loss">No fill</span>
                      ) : (
                        <span className={tx.type === "sell" || tx.type === "deposit" ? "gain" : ""}>
                          {tx.type === "buy" || tx.type === "withdraw" ? "−" : "+"}
                          {formatCurrency(tx.amount)}
                        </span>
                      )}
                    </div>
                    {tx.note && tx.note !== "Opening position" && tx.note !== "Starting balance" ? (
                      <span className="small muted">{tx.note}</span>
                    ) : null}
                    <div className="row between small dim">
                      <span>{formatRelativeDay(tx.createdAt)}</span>
                      {tx.realizedGain !== undefined ? (
                        <span className="row gap-sm">
                          <span className={tx.realizedGain >= 0 ? "gain" : "loss"}>realized {formatCurrency(tx.realizedGain)}</span>
                          {tx.type === "sell" ? <ShareTradeButton txId={tx.id} symbol={tx.symbol} /> : null}
                        </span>
                      ) : tx.mood ? (
                        <span>
                          {MOOD_INFO[tx.mood].emoji} {MOOD_INFO[tx.mood].label}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel className="stack gap-md" >
        <div className="row between wrap gap-sm">
          <strong className="row gap-sm">
            <Clock3 size={17} /> Open orders
            {openOrders.length ? <span className="pill pill-primary pill-compact">{openOrders.length}</span> : null}
          </strong>
          <span className="small muted">Checked on every price update while Sentia is open.</span>
        </div>
        {openOrders.length === 0 ? (
          <EmptyState title="No open orders" hint="Choose Limit or Stop above to place an order that waits for your price." />
        ) : (
          <div className="list">
            {openOrders.map((order) => (
              <OrderRow key={order.id} order={order} price={prices.get(order.symbol)?.price} onCancel={() => actions.cancelOrder(order.id)} />
            ))}
          </div>
        )}
        {closedOrders.length ? (
          <>
            <div className="row between wrap gap-sm" style={{ marginTop: 4 }}>
              <span className="eyebrow">Recent order history</span>
              <button type="button" className="btn btn-sm" onClick={actions.clearClosedOrders}>
                Clear history
              </button>
            </div>
            <div className="list">
              {closedOrders.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
            </div>
          </>
        ) : null}
      </Panel>
    </div>
  );
}

const STATUS_CLASS: Record<PendingOrder["status"], string> = {
  open: "pill-primary",
  filled: "pill-accent",
  cancelled: "",
  rejected: "pill-loss",
};

function OrderRow({ order, price, onCancel }: { order: PendingOrder; price?: number; onCancel?: () => void }) {
  const detail =
    order.status === "filled" && order.fillPrice !== undefined
      ? `Filled at ${formatCurrency(order.fillPrice)} · ${formatRelativeDay(order.filledAt ?? order.updatedAt)}`
      : order.status === "rejected"
        ? `Rejected: ${order.reason ?? "could not fill"}`
        : order.status === "cancelled"
          ? `Cancelled · ${formatRelativeDay(order.updatedAt)}`
          : `${orderCondition(order)}${price !== undefined ? ` · now ${formatCurrency(price)}` : ""}`;
  return (
    <div className="list-row">
      <span className={`pill ${STATUS_CLASS[order.status]}`} style={{ minWidth: 86, justifyContent: "center", textTransform: "capitalize" }}>
        {order.status}
      </span>
      <div className="grow stack" style={{ gap: 2, minWidth: 0 }}>
        <strong>
          {orderLabel(order)} · {formatNumber(order.shares)} {order.symbol} @ {formatCurrency(order.triggerPrice)}
        </strong>
        <span className="small dim">{detail}</span>
      </div>
      {onCancel ? (
        <button type="button" className="btn btn-sm btn-danger" onClick={onCancel} aria-label={`Cancel ${orderLabel(order)} order for ${order.symbol}`}>
          <X size={14} /> Cancel
        </button>
      ) : null}
    </div>
  );
}