// Ask Sentia: a coach that answers common questions from the user's own data.
// Ships rule-based only (no network, no API keys). The CoachProvider interface is
// the seam for plugging in an LLM later: build the same CoachContext, send it
// (or a summary of it) to a model, and return a CoachReply.
import { benchmarkStats, feedSegment, winRate } from "./benchmark";
import { BIAS_INFO, BIAS_KEYS } from "./biases";
import { disciplineScore, weakestPart } from "./discipline";
import { moodExtremes, moodStats } from "./moods";
import { realizedPnl, type PortfolioSummary } from "./portfolio";
import { BROAD_FUND_SECTORS, sectorOf, sectorWeights, type Sector } from "./sectors";
import type { AppState } from "./types";

export type CoachContext = { state: AppState; summary: PortfolioSummary; /** Defaults to Date.now(). */ now?: number };

export type CoachLink = { href: string; label: string };

export type CoachReply = {
  intent: CoachIntent;
  text: string;
  bullets?: string[];
  links?: CoachLink[];
};

export interface CoachProvider {
  id: string;
  label: string;
  /** Answer one question. Implementations must stay educational and never give personalised investment advice. */
  answer(question: string, context: CoachContext): Promise<CoachReply>;
}

export type CoachIntent =
  | "concentration"
  | "cash"
  | "winner"
  | "loser"
  | "thesis"
  | "biases"
  | "discipline"
  | "review"
  | "mood"
  | "diversification"
  | "benchmark"
  | "advice"
  | "position"
  | "help";

export const SUGGESTED_QUESTIONS = [
  "Am I too heavy in tech?",
  "How much cash do I have?",
  "What's my biggest winner?",
  "What's my biggest loser?",
  "Do all my holdings have a thesis?",
  "Have I shown any biases lately?",
  "What's my Discipline Score?",
  "What should I review this week?",
];

export const COACH_DISCLAIMER = "Educational coaching from your paper account only — not investment advice.";

const pct = (v: number, digits = 0) => `${v.toFixed(digits)}%`;
const money = (v: number) => `${v < 0 ? "−" : ""}$${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const SECTOR_WORDS: [RegExp, Sector][] = [
  [/\btech|technology|software|chip|semis?\b/, "Technology"],
  [/energy|oil|gas\b/, "Energy"],
  [/financ|bank/, "Financials"],
  [/health|pharma|biotech/, "Health Care"],
  [/consumer|retail/, "Consumer Discretionary"],
  [/staples/, "Consumer Staples"],
  [/communication|media|social/, "Communication Services"],
  [/industrial/, "Industrials"],
  [/bond/, "Bonds"],
  [/international|foreign|global/, "International"],
];

const INTENTS: [CoachIntent, RegExp][] = [
  ["advice", /should i (buy|sell|hold|add|trim|dump)|is \S+ a good (buy|stock|investment)|recommend|what (stock|should i) (to )?buy/],
  ["discipline", /discipline|my score|\bscore\b/],
  ["biases", /bias|fomo|revenge|panic|emotion|overtrad|disposition/],
  ["mood", /mood|feel|feeling/],
  ["review", /review|what should|next step|focus on|improve|work on|to.?do/],
  ["thesis", /thesis|theses|why do i own|documented/],
  ["winner", /winner|best|top perform|biggest gain|doing well/],
  ["loser", /loser|worst|losing|biggest loss|down the most/],
  ["cash", /cash|dry powder|buying power|liquid/],
  ["benchmark", /\bspy\b|s&p|benchmark|beat(ing)? the market|vs\.? market|outperform|return|performance|how am i doing|how('s| is) my (portfolio|account)|\bp\/?l\b|profit/],
  ["diversification", /diversif|spread/],
  ["concentration", /heavy|concentrat|overweight|exposure|too much|sector|allocation|tech|energy|bank|financ/],
];

export function detectIntent(question: string): CoachIntent {
  const q = question.toLowerCase();
  for (const [intent, re] of INTENTS) if (re.test(q)) return intent;
  return "help";
}

function positions(summary: PortfolioSummary) {
  return summary.holdings.map((h) => ({ symbol: h.symbol, value: h.marketValue }));
}

function concentrationReply(question: string, ctx: CoachContext): CoachReply {
  const { summary } = ctx;
  if (!summary.holdings.length) {
    return { intent: "concentration", text: "You don't hold any positions yet, so there's no concentration to worry about.", links: [{ href: "/app/trade", label: "Open Trade" }] };
  }
  const q = question.toLowerCase();
  const asked = SECTOR_WORDS.find(([re]) => re.test(q))?.[1];
  const weights = sectorWeights(positions(summary));
  const top = weights[0];
  const bullets = weights.slice(0, 5).map((w) => `${w.sector}: ${pct(w.percent)} of invested (${pct((w.value / summary.total) * 100)} of total)`);
  const broad = weights.filter((w) => BROAD_FUND_SECTORS.includes(w.sector)).reduce((s, w) => s + w.percent, 0);
  const note = broad > 0 ? " Broad index funds also hold tech and every other sector inside them, so your real sector mix is more spread out than these labels suggest." : "";
  if (asked) {
    const w = weights.find((x) => x.sector === asked);
    const share = w?.percent ?? 0;
    const heavy = share >= 35;
    const names = summary.holdings.filter((h) => sectorOf(h.symbol) === asked).map((h) => h.symbol);
    return {
      intent: "concentration",
      text: share
        ? `${asked} is ${pct(share)} of your invested money${names.length ? ` (${names.join(", ")})` : ""}. ${heavy ? "That's on the heavy side — a single-sector slump would hit you hard." : "That's a moderate weight, not an outsized bet."}${note}`
        : `You have no direct ${asked} holdings.${note}`,
      bullets,
      links: [{ href: "/app/allocate", label: "See allocation" }],
    };
  }
  return {
    intent: "concentration",
    text: `Your largest sector is ${top.sector} at ${pct(top.percent)} of invested money. ${top.percent >= 40 && !BROAD_FUND_SECTORS.includes(top.sector) ? "That's concentrated; consider whether one sector's bad year would derail you." : "No single sector dominates."}${note}`,
    bullets,
    links: [{ href: "/app/allocate", label: "See allocation" }],
  };
}

/** A held symbol named in the question ("how many shares of VTI do I own"), if any. */
function mentionedHolding(question: string, summary: PortfolioSummary) {
  const words = new Set(question.toUpperCase().match(/[A-Z][A-Z.]{0,11}/g) ?? []);
  return summary.holdings.find((h) => words.has(h.symbol.toUpperCase()));
}

function positionLine(h: PortfolioSummary["holdings"][number], total: number): string {
  const weight = total > 0 ? (h.marketValue / total) * 100 : 0;
  return `You hold ${h.shares.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${h.symbol} at an average cost of ${money(h.avgCost)}, worth ${money(h.marketValue)} (${pct(weight)} of your portfolio), ${h.gain >= 0 ? "up" : "down"} ${money(Math.abs(h.gain))} (${h.gainPercent >= 0 ? "+" : "−"}${Math.abs(h.gainPercent).toFixed(2)}%).`;
}

export function ruleBasedAnswer(question: string, ctx: CoachContext): CoachReply {
  const detected = detectIntent(question);
  const { state, summary } = ctx;
  const held = mentionedHolding(question, summary);
  const intent: CoachIntent = detected === "help" && held ? "position" : detected;
  const now = ctx.now ?? Date.now();
  switch (intent) {
    case "concentration":
      return concentrationReply(question, ctx);
    case "cash": {
      const cashPct = summary.total > 0 ? (summary.cash / summary.total) * 100 : 100;
      return {
        intent,
        text: `You have ${money(summary.cash)} in cash, ${pct(cashPct)} of your ${money(summary.total)} portfolio. ${cashPct < 2 ? "You're nearly fully invested, which leaves little room to act on new ideas." : cashPct > 50 ? "That's a large cash position: it cushions drawdowns but won't grow with the market." : "That's a reasonable buffer for new ideas."}`,
        links: [{ href: "/app/portfolio", label: "Open Portfolio" }],
      };
    }
    case "winner":
    case "loser": {
      const sorted = [...summary.holdings].sort((a, b) => b.gainPercent - a.gainPercent);
      const pick = intent === "winner" ? sorted[0] : sorted[sorted.length - 1];
      const closed = state.transactions.filter((t) => t.type === "sell" && t.realizedGain !== undefined);
      const closedPick = [...closed].sort((a, b) => (intent === "winner" ? (b.realizedGain ?? 0) - (a.realizedGain ?? 0) : (a.realizedGain ?? 0) - (b.realizedGain ?? 0)))[0];
      const bullets: string[] = [];
      if (closedPick && (intent === "winner" ? (closedPick.realizedGain ?? 0) > 0 : (closedPick.realizedGain ?? 0) < 0)) {
        bullets.push(`Biggest ${intent === "winner" ? "realized gain" : "realized loss"}: ${closedPick.symbol} (${money(closedPick.realizedGain ?? 0)}).`);
      }
      if (!pick) return { intent, text: "You don't hold any open positions right now.", bullets };
      const word = intent === "winner" ? "best" : "weakest";
      return {
        intent,
        text: `Your ${word} open position is ${pick.symbol}: ${pick.gainPercent >= 0 ? "+" : ""}${pick.gainPercent.toFixed(2)}% (${money(pick.gain)}) on a ${money(pick.costBasis)} cost basis. ${intent === "winner" ? "Check that it hasn't grown into an oversized position." : "Revisit its thesis: did the story change, or only the price?"}`,
        bullets,
        links: [{ href: "/app/thesis", label: "Review theses" }],
      };
    }
    case "thesis": {
      const missing = summary.holdings.filter((h) => !h.thesisId);
      const stressed = state.theses.filter((t) => t.stressTest).length;
      return {
        intent,
        text: !summary.holdings.length
          ? "No holdings yet. When you buy, write a thesis first — it's the habit that matters most."
          : missing.length === 0
            ? `All ${summary.holdings.length} holdings have a linked thesis. ${stressed ? `${stressed} have been stress-tested.` : "Next step: stress-test one — what would prove it wrong?"}`
            : `${missing.length} of ${summary.holdings.length} holdings have no thesis: ${missing.map((h) => h.symbol).join(", ")}.`,
        links: [{ href: "/app/thesis", label: "Write a thesis" }],
      };
    }
    case "biases": {
      const d = disciplineScore(state, summary, now);
      const flagged = BIAS_KEYS.filter((k) => d.bias.counts[k] > 0);
      return {
        intent,
        text: flagged.length
          ? `In the last 30 days Bias Radar flagged ${d.bias.total} pattern${d.bias.total === 1 ? "" : "s"} across ${d.bias.trades} trades.`
          : d.bias.trades
            ? `No bias patterns flagged across your ${d.bias.trades} trades in the last 30 days. Nice and steady.`
            : "No trades in the last 30 days, so nothing to flag.",
        bullets: flagged.map((k) => `${BIAS_INFO[k].label}: ${d.bias.counts[k]} — ${BIAS_INFO[k].tip}`),
        links: [{ href: "/app/insights", label: "Open Bias Radar" }],
      };
    }
    case "discipline": {
      const d = disciplineScore(state, summary, now);
      const weak = weakestPart(d);
      return {
        intent,
        text: `Your Discipline Score is ${d.score}/100 (${d.grade}).${weak ? ` The most room to improve is ${weak.label.toLowerCase()}: ${weak.tip}` : " Every part is close to full marks."}`,
        bullets: d.parts.map((p) => `${p.label}: ${Math.round(p.points)}/${p.max} — ${p.detail}`),
        links: [{ href: "/app/insights", label: "See the breakdown" }],
      };
    }
    case "review": {
      const d = disciplineScore(state, summary, now);
      const items: string[] = [];
      const weak = weakestPart(d);
      if (weak) items.push(`${weak.label}: ${weak.tip}`);
      const missing = summary.holdings.filter((h) => !h.thesisId).map((h) => h.symbol);
      if (missing.length) items.push(`Write theses for ${missing.join(", ")}.`);
      const big = summary.holdings.find((h) => summary.total > 0 && (h.marketValue / summary.total) * 100 > 25);
      if (big) items.push(`${big.symbol} is ${pct((big.marketValue / summary.total) * 100)} of your portfolio — is that intentional?`);
      if (d.bias.total) items.push(`Look back at the ${d.bias.total} Bias Radar flag${d.bias.total === 1 ? "" : "s"} from the last 30 days.`);
      const worst = [...summary.holdings].sort((a, b) => a.gainPercent - b.gainPercent)[0];
      if (worst && worst.gainPercent < -10) items.push(`${worst.symbol} is down ${Math.abs(worst.gainPercent).toFixed(0)}% — re-read its thesis and stress test.`);
      if (!items.length) items.push("Your process looks solid. Try a Time Machine scenario to practise under pressure.");
      return { intent, text: "Here's what I'd put on this week's review list:", bullets: items.slice(0, 5), links: [{ href: "/app/insights", label: "Open Insights" }] };
    }
    case "mood": {
      const stats = moodStats(state.transactions);
      const { best, worst } = moodExtremes(stats);
      const tagged = stats.reduce((s, m) => s + m.trades, 0);
      if (!tagged) return { intent, text: "You haven't tagged any trades with a mood yet. Pick one on the Trade screen and patterns will show up here.", links: [{ href: "/app/trade", label: "Open Trade" }] };
      return {
        intent,
        text: best
          ? `Your best results came from trades entered feeling ${best.label.toLowerCase()} (${money(best.realized)} realized).${worst ? ` The weakest: ${worst.label.toLowerCase()} (${money(worst.realized)}).` : ""}`
          : `You've tagged ${tagged} trades, but none of them are closed yet.`,
        bullets: stats.filter((s) => s.trades).map((s) => `${s.emoji} ${s.label}: ${s.trades} trades, ${s.closed} closed${s.winRate !== null ? `, ${s.winRate.toFixed(0)}% win rate` : ""}`),
        links: [{ href: "/app/insights", label: "Mood breakdown" }],
      };
    }
    case "diversification": {
      const n = summary.holdings.length;
      const sectors = new Set(summary.holdings.map((h) => sectorOf(h.symbol)));
      return {
        intent,
        text: n ? `You hold ${n} position${n === 1 ? "" : "s"} across ${sectors.size} sector${sectors.size === 1 ? "" : "s"} or fund types. ${n >= 5 || [...sectors].some((s) => BROAD_FUND_SECTORS.includes(s)) ? "That's a diversified base." : "Adding a few uncorrelated holdings (or a broad index fund) would spread your risk."}` : "No positions yet, so nothing to diversify.",
        links: [{ href: "/app/legends", label: "Compare with legend portfolios" }],
      };
    }
    case "benchmark": {
      const b = benchmarkStats(feedSegment(state.snapshots), state.transactions);
      const w = winRate(state.transactions);
      return {
        intent,
        text: b.points.length >= 2 ? `Since tracking began you're ${b.totalReturnPct >= 0 ? "up" : "down"} ${Math.abs(b.totalReturnPct).toFixed(2)}% vs SPY ${b.spyReturnPct >= 0 ? "+" : "−"}${Math.abs(b.spyReturnPct).toFixed(2)}%.` : "The benchmark chart is still collecting data — it fills in as prices update.",
        bullets: [`Realized P/L: ${money(realizedPnl(state))}`, w.percent === null ? "No closed trades yet." : `Win rate: ${w.percent.toFixed(0)}% (${w.wins}/${w.closed})`],
        links: [{ href: "/app/portfolio", label: "You vs. S&P 500" }],
      };
    }
    case "advice":
      return {
        intent,
        text: `I can't tell you what to buy or sell — Sentia is a practice tool, not an adviser. What I can do is help you test the idea: write a thesis, decide what would prove it wrong, and size it so one bad call can't sink the account.${held ? ` ${positionLine(held, summary.total)}` : ""}`,
        links: [
          { href: "/app/thesis", label: "Write a thesis" },
          { href: "/app/time-machine", label: "Practise in the Time Machine" },
        ],
      };
    case "position":
      return {
        intent,
        text: held ? positionLine(held, summary.total) : "You don't hold that one right now.",
        bullets: held ? [held.thesisId ? "It has a linked thesis." : "It has no linked thesis yet."] : [],
        links: [{ href: "/app/portfolio", label: "Open Portfolio" }],
      };
    default:
      return {
        intent: "help",
        text: "I can answer questions about your paper account: sector concentration, cash, returns vs. the S&P 500, winners and losers, a holding by its ticker, thesis coverage, biases, mood patterns and your Discipline Score. Try one of the suggestions.",
      };
  }
}

/** The shipped provider: deterministic, offline, rule-based. */
export const ruleBasedCoach: CoachProvider = {
  id: "rules",
  label: "Sentia rules",
  answer: async (question, context) => ruleBasedAnswer(question, context),
};
