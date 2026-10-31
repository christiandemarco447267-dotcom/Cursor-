// Tell the user when the price source changes (demo ↔ live), because that alone
// changes what their paper portfolio is worth. Pure; unit-tested.
import { formatCurrency } from "./format";
import { summarizePortfolio } from "./portfolio";
import type { AppState, Quote } from "./types";

export type Feed = "live" | "demo";

export type FeedNotice = { title: string; body: string; tone: "info" | "loss" };

/**
 * `prev` is what the user last saw: the previous feed + quotes this session, or
 * (on first load) the newest saved snapshot's feed and value.
 */
export function feedChangeNotice(
  state: AppState,
  prev: { feed: Feed; quotes?: Quote[]; total?: number } | null,
  next: { feed: Feed; quotes: Quote[]; reason?: "not-configured" | "unreachable" },
): FeedNotice | null {
  if (!prev || prev.feed === next.feed) return null;
  const before = prev.total ?? (prev.quotes ? summarizePortfolio(state, prev.quotes).total : null);
  const after = summarizePortfolio(state, next.quotes).total;
  const invested = state.holdings.length > 0;
  const moved = before !== null && invested && Math.abs(after - before) >= 0.01;
  const valuation = moved ? ` Your portfolio is now valued at ${formatCurrency(after)} (was ${formatCurrency(before as number)} on ${prev.feed} prices).` : "";
  if (next.feed === "live") {
    return { title: "Now using real market prices", body: `Prices switched from demo to live market data.${valuation}`, tone: "info" };
  }
  const why = next.reason === "unreachable" ? "Live prices are unavailable right now, so Sentia switched to demo prices." : "Prices switched to demo (simulated) data.";
  const paused = next.reason === "unreachable" ? " Pending orders and alerts are paused until live prices return." : "";
  return { title: "Showing demo prices", body: `${why}${valuation}${paused}`, tone: "loss" };
}
