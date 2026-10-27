// Mood tags: realized P/L and win rate grouped by the mood a trade was tagged with (pure; unit-tested).
import { closedTrades } from "./biases";
import { round2 } from "./portfolio";
import { MOODS, type Mood, type Transaction } from "./types";
import { normalizeSymbol } from "./validation";

export const MOOD_INFO: Record<Mood, { label: string; emoji: string }> = {
  confident: { label: "Confident", emoji: "💪" },
  anxious: { label: "Anxious", emoji: "😬" },
  bored: { label: "Bored", emoji: "🥱" },
  excited: { label: "Excited", emoji: "🤩" },
  calm: { label: "Calm", emoji: "🧘" },
};

export type MoodBasis = "entry" | "exit";

export type MoodStat = {
  mood: Mood;
  label: string;
  emoji: string;
  /** All buys and sells tagged with this mood. */
  trades: number;
  /** Closed trades (sells) attributed to this mood. */
  closed: number;
  wins: number;
  winRate: number | null;
  realized: number;
};

/**
 * Group closed trades by mood. With basis "entry" a sell is attributed to the mood
 * of the buy that opened the position (the most recent tagged buy of that symbol
 * since it was opened), falling back to the sell's own mood; with "exit" the sell's
 * own mood is used.
 */
export function moodStats(transactions: Transaction[], basis: MoodBasis = "entry"): MoodStat[] {
  const byMood = new Map<Mood, MoodStat>(
    MOODS.map((m) => [m, { mood: m, label: MOOD_INFO[m].label, emoji: MOOD_INFO[m].emoji, trades: 0, closed: 0, wins: 0, winRate: null, realized: 0 }]),
  );
  for (const tx of transactions) {
    if ((tx.type === "buy" || tx.type === "sell") && tx.mood) byMood.get(tx.mood)!.trades += 1;
  }
  const ordered = [...transactions].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  for (const closed of closedTrades(transactions)) {
    const sell = closed.tx;
    if (sell.realizedGain === undefined) continue;
    let mood: Mood | undefined = basis === "exit" ? sell.mood : undefined;
    if (basis === "entry") {
      const sellT = new Date(sell.createdAt).getTime();
      const openedT = sellT - closed.holdMs;
      const entry = ordered
        .filter(
          (o) =>
            o.type === "buy" &&
            o.mood &&
            o.symbol &&
            normalizeSymbol(o.symbol) === closed.symbol &&
            new Date(o.createdAt).getTime() >= openedT &&
            new Date(o.createdAt).getTime() <= sellT,
        )
        .pop();
      mood = entry?.mood ?? sell.mood;
    }
    if (!mood) continue;
    const stat = byMood.get(mood)!;
    stat.closed += 1;
    if (sell.realizedGain > 0) stat.wins += 1;
    stat.realized = round2(stat.realized + sell.realizedGain);
  }
  for (const stat of byMood.values()) stat.winRate = stat.closed ? (stat.wins / stat.closed) * 100 : null;
  return [...byMood.values()];
}

/** The tagged mood with the best / worst realized P/L (needs at least one closed trade). */
export function moodExtremes(stats: MoodStat[]): { best: MoodStat | null; worst: MoodStat | null } {
  const withData = stats.filter((s) => s.closed > 0);
  if (!withData.length) return { best: null, worst: null };
  const sorted = [...withData].sort((a, b) => b.realized - a.realized);
  return { best: sorted[0], worst: sorted.length > 1 ? sorted[sorted.length - 1] : null };
}
