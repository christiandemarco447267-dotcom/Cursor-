"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatCurrency, formatNumber, formatRelativeDay } from "@/lib/format";
import { DEMO_UNIVERSE, nameForSymbol } from "@/lib/market";
import { quoteMap } from "@/lib/portfolio";
import { useApp } from "@/lib/store";
import { isValidSymbol, normalizeSymbol, parseAmount } from "@/lib/validation";
import { EmptyState, Loading, Panel, PageHeader } from "./ui";

type Mode = "buy" | "sell";

export function TradeView() {
  const { ready, state, quotes, actions } = useApp();
  const searchParams = useSearchParams();
  const initialSymbol = searchParams.get("symbol") ?? "";

  const [mode, setMode] = useState<Mode>("buy");
  const [symbol, setSymbol] = useState(initialSymbol.toUpperCase());
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const prices = useMemo(() => quoteMap(quotes), [quotes]);

  if (!ready || !state) return <Loading />;

  const normalized = normalizeSymbol(symbol);
  const quote = prices.get(normalized);
  const held = state.holdings.find((h) => h.symbol.toUpperCase() === normalized);
  const sharesNum = parseAmount(shares);
  const priceNum = parseAmount(price);
  const estimated = sharesNum !== null && priceNum !== null ? sharesNum * priceNum : null;

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
    if (priceNum === null || priceNum < 0) {
      setError("Enter a valid price per share.");
      return;
    }

    try {
      if (mode === "buy") {
        actions.buy({ symbol: normalized, shares: sharesNum, price: priceNum });
        setNotice(`Bought ${formatNumber(sharesNum)} ${normalized} at ${formatCurrency(priceNum)}.`);
      } else {
        actions.sell({ symbol: normalized, shares: sharesNum, price: priceNum });
        setNotice(`Sold ${formatNumber(sharesNum)} ${normalized} at ${formatCurrency(priceNum)}.`);
      }
      setShares("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trade could not be completed.");
    }
  };

  const recent = [...state.transactions].slice(-8).reverse();

  return (
    <div className="stack gap-lg animate-in">
      <PageHeader title="Trade" subtitle="Simulated buy & sell. Cash moves, cost basis averages, gains realize on sale." />

      <div className="grid grid-2">
        <Panel strong className="stack gap-md">
          <div className="row gap-sm">
            <button
              type="button"
              className={`btn btn-sm ${mode === "buy" ? "btn-primary" : ""}`}
              onClick={() => setMode("buy")}
            >
              <ArrowUpRight size={15} /> Buy
            </button>
            <button
              type="button"
              className={`btn btn-sm ${mode === "sell" ? "btn-primary" : ""}`}
              onClick={() => setMode("sell")}
            >
              <ArrowDownLeft size={15} /> Sell
            </button>
            <span className="grow" />
            <span className="pill">Cash {formatCurrency(state.cash)}</span>
          </div>

          <form className="stack gap-md" onSubmit={submit}>
            <div className="field">
              <label htmlFor="symbol">Symbol</label>
              <input
                id="symbol"
                className="input"
                list="symbol-options"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. AAPL"
                maxLength={12}
                autoComplete="off"
              />
              <datalist id="symbol-options">
                {DEMO_UNIVERSE.map((entry) => (
                  <option key={entry.symbol} value={entry.symbol}>
                    {entry.name}
                  </option>
                ))}
              </datalist>
              {normalized ? <span className="small dim">{nameForSymbol(normalized)}</span> : null}
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
                <label htmlFor="price">Price / share</label>
                <input
                  id="price"
                  className="input"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                />
                {quote ? (
                  <button type="button" className="small dim" style={{ textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0 }} onClick={useMarketPrice}>
                    Market {formatCurrency(quote.price)} — use it
                  </button>
                ) : null}
              </div>
            </div>

            {estimated !== null ? (
              <div className="row between">
                <span className="muted small">Estimated {mode === "buy" ? "cost" : "proceeds"}</span>
                <strong>{formatCurrency(estimated)}</strong>
              </div>
            ) : null}

            {error ? <span className="form-error">{error}</span> : null}
            {notice ? <span className="form-ok">{notice}</span> : null}

            <button type="submit" className="btn btn-primary btn-block">
              {mode === "buy" ? "Buy shares" : "Sell shares"}
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
                        {tx.shares && tx.price ? ` · ${formatNumber(tx.shares)} @ ${formatCurrency(tx.price)}` : ""}
                      </strong>
                      <span className={tx.type === "sell" || tx.type === "deposit" ? "gain" : ""}>
                        {tx.type === "buy" || tx.type === "withdraw" ? "−" : "+"}
                        {formatCurrency(tx.amount)}
                      </span>
                    </div>
                    <div className="row between small dim">
                      <span>{formatRelativeDay(tx.createdAt)}</span>
                      {tx.realizedGain !== undefined ? (
                        <span className={tx.realizedGain >= 0 ? "gain" : "loss"}>
                          realized {formatCurrency(tx.realizedGain)}
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
    </div>
  );
}
