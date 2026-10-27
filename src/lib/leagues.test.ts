import assert from "node:assert/strict";
import { test } from "node:test";
import { buildMemberSummary, generateLeagueCode, normalizeLeagueCode, parseMember, rankLeague, type LeagueMember } from "./leagues";

const m = (uid: string, displayName: string, disciplineScore: number, monthlyReturnPct: number | null): LeagueMember => ({ uid, displayName, disciplineScore, monthlyReturnPct });

test("rankLeague orders by Discipline Score, then monthly return, with shared ranks for ties", () => {
  const ranked = rankLeague([
    m("1", "Ana", 80, 2),
    m("2", "Ben", 92, -1),
    m("3", "Cal", 80, 5),
    m("4", "Dee", 80, 2),
    m("5", "Eve", 80, null),
  ]);
  assert.deepEqual(ranked.map((r) => r.displayName), ["Ben", "Cal", "Ana", "Dee", "Eve"]);
  assert.deepEqual(ranked.map((r) => r.rank), [1, 2, 3, 3, 5]);
  assert.deepEqual(rankLeague([]), []);
});

test("league codes: readable alphabet, normalization and validation", () => {
  let i = 0;
  const code = generateLeagueCode(() => ((i += 7) % 32) / 32);
  assert.match(code, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(normalizeLeagueCode(" abc-234 "), "ABC234");
  assert.equal(normalizeLeagueCode("ABC10O"), null); // 0/1/O are excluded
  assert.equal(normalizeLeagueCode("ABC"), null);
});

test("member summaries are sanitized; malformed docs are dropped", () => {
  const s = buildMemberSummary({ displayName: "   ", disciplineScore: 104.6, monthlyReturnPct: 3.14159 });
  assert.deepEqual(s, { displayName: "Investor", disciplineScore: 100, monthlyReturnPct: 3.14 });
  assert.equal(buildMemberSummary({ displayName: "A".repeat(50), disciplineScore: 50, monthlyReturnPct: NaN }).displayName.length, 30);
  assert.equal(buildMemberSummary({ displayName: "x", disciplineScore: 50, monthlyReturnPct: NaN }).monthlyReturnPct, null);
  assert.equal(parseMember("u", { displayName: "Z", disciplineScore: "high" }), null);
  assert.equal(parseMember("u", { displayName: "Z", disciplineScore: 70, monthlyReturnPct: null })?.uid, "u");
});
