import assert from "node:assert/strict";
import { test } from "node:test";
import { LEGEND_PORTFOLIOS } from "../data/legends";
import { compareWithLegend, concentration, normalizeWeights } from "./legends";

const berkshire = LEGEND_PORTFOLIOS.find((l) => l.id === "berkshire")!;
const sixty = LEGEND_PORTFOLIOS.find((l) => l.id === "sixty-forty")!;

test("legend data records its source and as-of date, and weights add up", () => {
  for (const l of LEGEND_PORTFOLIOS) {
    assert.match(l.asOf, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(l.source.length > 5);
    const sum = l.holdings.reduce((s, h) => s + h.weight, 0) + l.otherWeight;
    assert.ok(Math.abs(sum - 100) < 0.05, `${l.id} sums to ${sum}`);
  }
  assert.equal(berkshire.kind, "13F");
  assert.ok(berkshire.sourceUrl?.startsWith("https://www.sec.gov/"));
});

test("weight-based overlap: identical = 100%, disjoint = 0%", () => {
  assert.equal(Math.round(compareWithLegend([{ symbol: "VTI", value: 600 }, { symbol: "BND", value: 400 }], sixty).overlapPct), 100);
  assert.equal(compareWithLegend([{ symbol: "TSLA", value: 1000 }], sixty).overlapPct, 0);
  const half = compareWithLegend([{ symbol: "VTI", value: 500 }, { symbol: "TSLA", value: 500 }], sixty);
  assert.equal(Math.round(half.overlapPct), 50);
  assert.deepEqual(half.shared.map((s) => s.symbol), ["VTI"]);
});

test("share classes merge (GOOG + GOOGL) and sectors compare side by side", () => {
  const c = compareWithLegend([{ symbol: "GOOG", value: 100 }], berkshire);
  assert.equal(c.shared[0].symbol, "GOOGL");
  assert.ok(c.shared[0].legend > 12); // 9.41 + 3.21, renormalized
  const fin = c.sectors.find((s) => s.sector === "Financials");
  assert.ok(fin && fin.legend > 30 && fin.you === 0);
  const comm = c.sectors.find((s) => s.sector === "Communication Services");
  assert.equal(Math.round(comm?.you ?? 0), 100);
});

test("concentration metrics", () => {
  const conc = concentration(normalizeWeights([{ symbol: "A", weight: 50 }, { symbol: "B", weight: 50 }]));
  assert.equal(conc.top1, 50);
  assert.equal(conc.count, 2);
  assert.ok(Math.abs(conc.effectiveHoldings - 2) < 1e-9);
});
