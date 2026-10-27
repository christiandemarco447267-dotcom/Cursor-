#!/usr/bin/env node
// Fetches REAL daily closes for the Time Machine scenarios and writes compact JSON
// to src/data/time-machine.json. Source: Yahoo Finance chart API (split-adjusted
// "close", not dividend-adjusted). Run: node scripts/fetch-time-machine-data.mjs
// Tickers with no data in a window (e.g. TSLA before its 2010 IPO) are dropped,
// never invented.
import { writeFileSync } from "node:fs";

const SCENARIOS = [
  { id: "covid-2020", start: "2020-02-03", end: "2020-06-30" },
  { id: "gfc-2008", start: "2008-09-02", end: "2009-03-31" },
  { id: "meme-2021", start: "2021-01-04", end: "2021-12-31" },
];
const TICKERS = ["SPY", "QQQ", "AAPL", "MSFT", "AMZN", "NVDA", "JPM", "XOM", "TSLA"];
// GME is only part of the 2021 meme-stock scenario.
const EXTRA = { "meme-2021": ["GME"] };

const day = (iso) => Math.floor(new Date(`${iso}T00:00:00Z`).getTime() / 1000);

async function fetchSeries(symbol, start, end) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${day(start)}&period2=${day(end) + 86400}&interval=1d&events=split`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`${symbol}: HTTP ${res.status}`);
  const json = await res.json();
  const r = json.chart?.result?.[0];
  if (!r?.timestamp) return null;
  const closes = r.indicators.quote[0].close;
  const out = new Map();
  r.timestamp.forEach((t, i) => {
    const c = closes[i];
    if (typeof c === "number" && c > 0) {
      // Yahoo daily timestamps are the session open (America/New_York); shift to get the ET date.
      const d = new Date((t + r.meta.gmtoffset) * 1000).toISOString().slice(0, 10);
      if (d >= start && d <= end) out.set(d, Math.round(c * 100) / 100);
    }
  });
  return out;
}

const result = { source: "Yahoo Finance chart API (query1.finance.yahoo.com/v8/finance/chart), daily split-adjusted closes (not dividend-adjusted)", fetchedAt: new Date().toISOString().slice(0, 10), scenarios: {} };
for (const sc of SCENARIOS) {
  const spy = await fetchSeries("SPY", sc.start, sc.end);
  const dates = [...spy.keys()].sort();
  const prices = {};
  const dropped = [];
  for (const sym of [...TICKERS, ...(EXTRA[sc.id] ?? [])]) {
    const series = sym === "SPY" ? spy : await fetchSeries(sym, sc.start, sc.end).catch(() => null);
    // Require a close on every SPY trading day; otherwise drop the ticker for this scenario.
    if (!series || dates.some((d) => !series.has(d))) {
      dropped.push(sym);
      continue;
    }
    prices[sym] = dates.map((d) => series.get(d));
  }
  result.scenarios[sc.id] = { dates, prices, dropped };
  console.log(sc.id, dates.length, "days", Object.keys(prices).join(","), "dropped:", dropped.join(",") || "none");
}
writeFileSync("src/data/time-machine.json", JSON.stringify(result));
