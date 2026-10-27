"use client";

import Link from "next/link";
import { useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/format";
import { DEMO_UNIVERSE, nameForSymbol, priceSourceOf } from "@/lib/market";
import { quoteMap } from "@/lib/portfolio";
import { useApp } from "@/lib/store";
import { normalizeSymbol } from "@/lib/validation";
import { DemoPricesBadge, Loading, Panel, PageHeader, Sparkline, StarButton } from "./ui";

export function MarketsView() {
  const { ready, state, quotes, market, refreshMarket } = useApp();
  const prices = useMemo(() => quoteMap(quotes), [quotes]);

  const symbols = useMemo(() => {
    const held = state ? state.holdings.map((h) => normalizeSymbol(h.symbol)) : [];
    const universe = DEMO_UNIVERSE.map((e) => e.symbol);
    return Array.from(new Set([...universe, ...held]));
  }, [state]);

  if (!ready || !state) return <Loading />;

  const statusText =
    market.status === "open"
      ? "Live · market open"
      : market.status === "closed"
        ? "Live · market closed"
        : market.status === "error"
          ? "Market unavailable — showing last data"
          : "Simulated prices · auto-updating every 15s";
  const simulated = priceSourceOf(market) === "demo" || priceSourceOf(market) === "mixed";

  return (
    <div className="stack gap-lg animate-in">
      <PageHeader
        title="Markets"
        subtitle="Prices for the demo universe plus anything you hold. Star a ticker to add it to your Watchlist."
        action={
          <button className="btn btn-sm" onClick={refreshMarket}>
            <RefreshCw size={15} /> Refresh
          </button>
        }
      />

      <Panel className="row between wrap gap-sm">
        <span className="row wrap gap-sm">
          <span className={`pill ${market.status === "error" ? "" : "pill-primary"}`}>{statusText}</span>
          <DemoPricesBadge />
        </span>
        {market.updatedAt ? <span className="small dim">Updated {new Date(market.updatedAt).toLocaleTimeString()}</span> : null}
        {simulated ? (
          <p className="small muted" style={{ flexBasis: "100%", margin: 0 }}>
            These prices are simulated for practice and are not real market data. Self-hosted builds can enable live
            quotes with a Finnhub key.
          </p>
        ) : null}
      </Panel>

      <Panel>
        <div className="list">
          {symbols.map((symbol) => {
            const quote = prices.get(symbol);
            const change = quote?.changePercent ?? 0;
            return (
              <div key={symbol} className="list-row">
                <span className="sym-badge">{symbol.slice(0, 4)}</span>
                <div className="grow stack" style={{ gap: 2 }}>
                  <strong>{symbol}</strong>
                  <span className="small muted">{nameForSymbol(symbol)}</span>
                </div>
                <Sparkline symbol={symbol} />
                <div className="stack" style={{ alignItems: "flex-end", gap: 2 }}>
                  <strong>{quote ? formatCurrency(quote.price) : "—"}</strong>
                  <span className={`small ${change >= 0 ? "gain" : "loss"}`}>{formatPercent(change, true)}</span>
                </div>
                <div className="row gap-sm">
                  <StarButton symbol={symbol} />
                  <Link
                    href={`/app/trade?symbol=${encodeURIComponent(symbol)}`}
                    className="btn btn-sm"
                    aria-label={`Trade ${symbol}`}
                  >
                    Trade
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
