"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bell, BellPlus, BellRing, Trash2 } from "lucide-react";
import { alertCrossed } from "@/lib/alerts";
import { formatCurrency, formatPercent, formatRelativeDay } from "@/lib/format";
import { DEMO_UNIVERSE, nameForSymbol } from "@/lib/market";
import { quoteMap } from "@/lib/portfolio";
import { useApp } from "@/lib/store";
import type { PriceAlert } from "@/lib/types";
import { isValidSymbol, normalizeSymbol, parseAmount } from "@/lib/validation";
import { DemoPricesBadge, EmptyState, Loading, PageHeader, Panel, Sparkline, StarButton } from "./ui";

type Permission = NotificationPermission | "unsupported";

function readPermission(): Permission {
  return typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported";
}

function NotificationToggle() {
  const [permission, setPermission] = useState<Permission>(readPermission);
  if (permission === "unsupported") return null;
  if (permission === "granted") {
    return (
      <span className="pill pill-primary" title="Alerts and order fills also show as browser notifications.">
        <BellRing size={14} /> Browser alerts on
      </span>
    );
  }
  if (permission === "denied") {
    return (
      <span className="pill" title="Notifications are blocked in your browser settings. In-app alerts still work.">
        <Bell size={14} /> Browser alerts blocked
      </span>
    );
  }
  return (
    <button
      type="button"
      className="btn btn-sm"
      onClick={() => {
        void Notification.requestPermission().then(setPermission, () => setPermission(readPermission()));
      }}
    >
      <BellRing size={15} /> Enable browser alerts
    </button>
  );
}

function AlertForm({ symbol, price, onDone }: { symbol: string; price?: number; onDone: () => void }) {
  const { actions } = useApp();
  const [direction, setDirection] = useState<PriceAlert["direction"]>("above");
  // Start 5% above the current price: an alert at today's exact price would fire on the next tick.
  const [value, setValue] = useState(price ? (Math.round(price * 105) / 100).toFixed(2) : "");
  const [error, setError] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const target = parseAmount(value);
    if (target === null || target <= 0) {
      setError("Enter a price above $0.");
      return;
    }
    if (price !== undefined && alertCrossed({ direction, price: target }, price)) {
      setError(
        `${symbol} is already ${direction === "above" ? "at or above" : "at or below"} ${formatCurrency(target)} (now ${formatCurrency(price)}), so this alert would fire right away. Pick a ${direction === "above" ? "higher" : "lower"} price or flip the direction.`,
      );
      return;
    }
    try {
      actions.addAlert({ symbol, direction, price: target });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add the alert.");
    }
  };

  return (
    <form className="alert-form row wrap gap-sm" onSubmit={submit} aria-label={`New price alert for ${symbol}`}>
      <span className="small muted">Alert me when {symbol} is</span>
      <select
        className="select"
        style={{ width: "auto" }}
        value={direction}
        onChange={(e) => setDirection(e.target.value as PriceAlert["direction"])}
        aria-label="Direction"
      >
        <option value="above">above</option>
        <option value="below">below</option>
      </select>
      <input
        className="input"
        style={{ width: 120 }}
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="$0.00"
        aria-label="Alert price"
        autoFocus
      />
      <button type="submit" className="btn btn-primary btn-sm">
        Add alert
      </button>
      <button type="button" className="btn btn-sm" onClick={onDone}>
        Cancel
      </button>
      {error ? (
        <span className="form-error" role="alert" style={{ flexBasis: "100%" }}>
          {error}
        </span>
      ) : null}
    </form>
  );
}

function AlertRow({ alert, price }: { alert: PriceAlert; price?: number }) {
  const { actions } = useApp();
  const triggered = alert.status === "triggered";
  return (
    <div className="list-row">
      <span className={`pill ${triggered ? "" : "pill-primary"}`} style={{ minWidth: 92, justifyContent: "center" }}>
        {triggered ? "Triggered" : "Active"}
      </span>
      <div className="grow stack" style={{ gap: 2 }}>
        <strong>
          {alert.symbol} {alert.direction} {formatCurrency(alert.price)}
        </strong>
        <span className="small dim">
          {triggered && alert.triggeredAt
            ? `Fired ${formatRelativeDay(alert.triggeredAt).toLowerCase()} at ${formatCurrency(alert.triggeredPrice ?? 0)}`
            : price !== undefined
              ? `Now ${formatCurrency(price)} · ${formatCurrency(Math.abs(alert.price - price))} away`
              : "Waiting for a quote"}
        </span>
      </div>
      <button
        type="button"
        className="btn btn-sm btn-icon btn-danger"
        onClick={() => actions.removeAlert(alert.id)}
        aria-label={`Delete alert ${alert.symbol} ${alert.direction} ${alert.price}`}
        title="Delete alert"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

export function WatchlistView() {
  const { ready, state, quotes, actions } = useApp();
  const prices = useMemo(() => quoteMap(quotes), [quotes]);
  const [addSymbol, setAddSymbol] = useState("");
  const [addError, setAddError] = useState("");
  const [alertFor, setAlertFor] = useState<string | null>(null);

  if (!ready || !state) return <Loading />;

  const active = state.alerts.filter((a) => a.status === "active");
  const triggered = state.alerts.filter((a) => a.status === "triggered").reverse();

  const add = (event: React.FormEvent) => {
    event.preventDefault();
    setAddError("");
    const symbol = normalizeSymbol(addSymbol);
    if (!isValidSymbol(symbol)) {
      setAddError("Enter a valid ticker symbol.");
      return;
    }
    if (state.watchlist.includes(symbol)) {
      setAddError(`${symbol} is already on your watchlist.`);
      return;
    }
    try {
      actions.toggleWatch(symbol);
      setAddSymbol("");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Couldn't add that symbol.");
    }
  };

  return (
    <div className="stack gap-lg animate-in">
      <PageHeader
        title="Watchlist"
        subtitle="Tickers you're following, with one-time price alerts."
        action={
          <span className="row wrap gap-sm">
            <DemoPricesBadge />
            <NotificationToggle />
          </span>
        }
      />

      <Panel className="stack gap-md">
        <form className="row wrap gap-sm" onSubmit={add}>
          <input
            className="input"
            style={{ maxWidth: 220 }}
            list="watch-symbol-options"
            value={addSymbol}
            onChange={(e) => setAddSymbol(e.target.value.toUpperCase())}
            placeholder="Add a ticker, e.g. NVDA"
            maxLength={12}
            aria-label="Ticker to watch"
            autoComplete="off"
          />
          <datalist id="watch-symbol-options">
            {DEMO_UNIVERSE.map((entry) => (
              <option key={entry.symbol} value={entry.symbol}>
                {entry.name}
              </option>
            ))}
          </datalist>
          <button type="submit" className="btn btn-primary btn-sm" disabled={!addSymbol.trim()}>
            Watch
          </button>
          {addError ? (
            <span className="form-error" role="alert">
              {addError}
            </span>
          ) : null}
        </form>

        {state.watchlist.length === 0 ? (
          <EmptyState title="Your watchlist is empty" hint="Star tickers in Markets or Trade, or add one above." />
        ) : (
          <div className="list">
            {state.watchlist.map((symbol) => {
              const quote = prices.get(symbol);
              const change = quote?.changePercent ?? 0;
              const count = active.filter((a) => a.symbol === symbol).length;
              return (
                <div key={symbol} className="stack" style={{ gap: 0 }}>
                  <div className="list-row">
                    <span className="sym-badge">{symbol.slice(0, 4)}</span>
                    <div className="grow stack" style={{ gap: 2, minWidth: 0 }}>
                      <strong>{symbol}</strong>
                      <span className="small muted truncate">{nameForSymbol(symbol)}</span>
                    </div>
                    <Sparkline symbol={symbol} />
                    <div className="stack" style={{ alignItems: "flex-end", gap: 2, minWidth: 84 }}>
                      <strong>{quote ? formatCurrency(quote.price) : "—"}</strong>
                      <span className={`small ${change >= 0 ? "gain" : "loss"}`}>{quote ? formatPercent(change, true) : "pending"}</span>
                    </div>
                    <div className="row gap-sm watch-actions">
                      <button
                        type="button"
                        className={`btn btn-sm ${alertFor === symbol ? "btn-primary" : ""}`}
                        style={{ minWidth: 104, justifyContent: "center" }}
                        onClick={() => setAlertFor(alertFor === symbol ? null : symbol)}
                        aria-expanded={alertFor === symbol}
                        aria-label={`Add a price alert for ${symbol}`}
                      >
                        <BellPlus size={15} /> {count ? `${count} alert${count > 1 ? "s" : ""}` : "Alert"}
                      </button>
                      <Link href={`/app/trade?symbol=${encodeURIComponent(symbol)}`} className="btn btn-sm" aria-label={`Trade ${symbol}`}>
                        Trade
                      </Link>
                      <StarButton symbol={symbol} />
                    </div>
                  </div>
                  {alertFor === symbol ? (
                    <AlertForm symbol={symbol} price={quote?.price} onDone={() => setAlertFor(null)} />
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <div className="grid grid-2">
        <Panel className="stack gap-sm">
          <strong className="row gap-sm">
            <BellRing size={17} /> Active alerts
          </strong>
          {active.length === 0 ? (
            <EmptyState title="No active alerts" hint="Use the Alert button on a watched ticker." />
          ) : (
            <div className="list">
              {active.map((alert) => (
                <AlertRow key={alert.id} alert={alert} price={prices.get(alert.symbol)?.price} />
              ))}
            </div>
          )}
        </Panel>
        <Panel className="stack gap-sm">
          <strong className="row gap-sm">
            <Bell size={17} /> Triggered
          </strong>
          {triggered.length === 0 ? (
            <EmptyState title="Nothing has fired yet" hint="Each alert fires once, then moves here." />
          ) : (
            <div className="list">
              {triggered.map((alert) => (
                <AlertRow key={alert.id} alert={alert} />
              ))}
            </div>
          )}
        </Panel>
      </div>

      <p className="disclaimer">
        Alerts are checked against each price update while Sentia is open in a tab (every ~15 seconds). They can&apos;t
        fire while the app is closed.
      </p>
    </div>
  );
}
