"use client";

import { useApp } from "@/lib/app-context";
import { formatCurrency, formatPercent } from "@/lib/format";
import { DEMO_UNIVERSE, sparklineForSymbol } from "@/lib/market";
import { Button, PageHeader, Panel, Sparkline } from "@/components/ui";

export function MarketsView() {
  const { market, marketLoading, marketError, refreshMarket, quotes } = useApp();
  const bySymbol = new Map(quotes.map((q) => [q.symbol, q]));

  return (
    <div className="stack gap-lg animate-in">
      <PageHeader
        title="Markets"
        subtitle="Quotes are proxied through a rate-limited API route. Live data requires FINNHUB_API_KEY."
        action={
          <Button variant="secondary" onClick={() => void refreshMarket()}>
            Refresh
          </Button>
        }
      />

      <Panel className="market-bar static">
        {marketLoading
          ? "Loading market data…"
          : marketError
            ? marketError
            : market?.status === "demo"
              ? "Serving deterministic demo quotes (safe default)."
              : market?.updatedAt
                ? `Live feed · updated ${new Date(market.updatedAt).toLocaleTimeString()}`
                : "Live feed ready"}
      </Panel>

      <ul className="market-list">
        {DEMO_UNIVERSE.map((item) => {
          const q = bySymbol.get(item.symbol);
          const change = q?.changePercent ?? item.changePercent;
          const price = q?.price ?? item.price;
          return (
            <li key={item.symbol} className="market-item panel">
              <div>
                <strong>{item.symbol}</strong>
                <span className="muted block">{item.name}</span>
              </div>
              <Sparkline
                values={sparklineForSymbol(item.symbol)}
                positive={change >= 0}
              />
              <div className="holding-right">
                <strong>{formatCurrency(price)}</strong>
                <span className={change >= 0 ? "c-gain" : "c-loss"}>
                  {formatPercent(change)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
