// Friend leagues: invite codes, the small public member summary and leaderboard
// ranking (pure; unit-tested). Firestore I/O lives in league-store.ts.
import { z } from "zod";
import { LEAGUE_CODE_REGEX } from "./types";

/** No 0/O/1/I to keep codes easy to read aloud. */
export const LEAGUE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const LEAGUE_CODE_LENGTH = 6;

export function generateLeagueCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < LEAGUE_CODE_LENGTH; i += 1) {
    code += LEAGUE_CODE_ALPHABET[Math.floor(random() * LEAGUE_CODE_ALPHABET.length) % LEAGUE_CODE_ALPHABET.length];
  }
  return code;
}

/** Accepts "abc-234", " ABC 234 " etc. Returns null when it isn't a valid code. */
export function normalizeLeagueCode(raw: string): string | null {
  const code = raw.toUpperCase().replace(/[\s-]/g, "");
  return LEAGUE_CODE_REGEX.test(code) ? code : null;
}

export const LeagueNameSchema = z.string().trim().min(1).max(40);

/** What each member publishes to the league — nothing else from the account leaves the device. */
export const MemberSummarySchema = z.object({
  displayName: z.string().trim().min(1).max(30),
  disciplineScore: z.number().int().min(0).max(100),
  monthlyReturnPct: z.number().min(-100).max(1000).nullable(),
});
export type MemberSummary = z.infer<typeof MemberSummarySchema>;

export type LeagueMember = MemberSummary & { uid: string; updatedAt?: number };

export function buildMemberSummary(input: { displayName: string; disciplineScore: number; monthlyReturnPct: number | null }): MemberSummary {
  const name = input.displayName.trim().replace(/\s+/g, " ").slice(0, 30) || "Investor";
  const ret = input.monthlyReturnPct;
  return {
    displayName: name,
    disciplineScore: Math.max(0, Math.min(100, Math.round(input.disciplineScore))),
    monthlyReturnPct: ret === null || !Number.isFinite(ret) ? null : Math.max(-100, Math.min(1000, Math.round(ret * 100) / 100)),
  };
}

/** Parse a member document from Firestore; null when it's malformed. */
export function parseMember(uid: string, data: unknown): LeagueMember | null {
  const parsed = MemberSummarySchema.safeParse(data);
  if (!parsed.success) return null;
  const raw = data as { updatedAt?: { toMillis?: () => number } };
  const updatedAt = typeof raw.updatedAt?.toMillis === "function" ? raw.updatedAt.toMillis() : undefined;
  return { uid, ...parsed.data, updatedAt };
}

export type RankedMember = LeagueMember & { rank: number };

/**
 * Leaderboard order: Discipline Score (high → low), then monthly return (high →
 * low; members without a return yet sort after those with one), then name.
 * Members tied on both score and return share a rank (1, 2, 2, 4…).
 */
export function rankLeague(members: LeagueMember[]): RankedMember[] {
  const ret = (m: LeagueMember) => (m.monthlyReturnPct === null ? -Infinity : m.monthlyReturnPct);
  const sorted = [...members].sort(
    (a, b) =>
      b.disciplineScore - a.disciplineScore ||
      ret(b) - ret(a) ||
      a.displayName.localeCompare(b.displayName) ||
      a.uid.localeCompare(b.uid),
  );
  const out: RankedMember[] = [];
  sorted.forEach((m, i) => {
    const prev = out[i - 1];
    const tied = prev && prev.disciplineScore === m.disciplineScore && ret(prev) === ret(m);
    out.push({ ...m, rank: tied ? prev.rank : i + 1 });
  });
  return out;
}
