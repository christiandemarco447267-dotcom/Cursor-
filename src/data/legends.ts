// Static "legend" portfolios for comparison. Educational only — not a recommendation.
//
// Berkshire Hathaway: top 15 positions from its Form 13F-HR for the quarter ended
// 2026-06-30 (filed 2026-08-14), SEC accession 0001193125-26-352200. Weights are
// each position's reported market value as a share of the filing's total reported
// 13F value ($299,253,556,246 across 89 entries / 29 issuers). Alphabet's Class A
// and Class C lines are kept separate, as filed. A 13F only covers US-listed
// long equity positions, is filed ~45 days after quarter end, and excludes cash,
// bonds and private businesses, so it is a snapshot, not Berkshire's whole balance sheet.
// Source: https://www.sec.gov/Archives/edgar/data/1067983/000119312526352200/56757.xml

export type LegendHolding = { symbol: string; name: string; weight: number };

export type LegendPortfolio = {
  id: string;
  name: string;
  kind: "13F" | "model";
  description: string;
  asOf: string;
  asOfLabel: string;
  source: string;
  sourceUrl?: string;
  holdings: LegendHolding[];
  /** Share of the portfolio not listed in `holdings` (e.g. the 13F's smaller positions). */
  otherWeight: number;
};

export const LEGEND_PORTFOLIOS: LegendPortfolio[] = [
  {
    id: "berkshire",
    name: "Berkshire Hathaway",
    kind: "13F",
    description: "Warren Buffett's conglomerate: concentrated, long-term stakes in durable franchises.",
    asOf: "2026-06-30",
    asOfLabel: "13F for Q2 2026 (quarter ended Jun 30, 2026; filed Aug 14, 2026)",
    source: "SEC EDGAR Form 13F-HR, accession 0001193125-26-352200",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1067983/000119312526352200/56757.xml",
    holdings: [
      { symbol: "AAPL", name: "Apple Inc.", weight: 22.04 },
      { symbol: "AXP", name: "American Express Co.", weight: 17.14 },
      { symbol: "KO", name: "Coca-Cola Co.", weight: 10.86 },
      { symbol: "GOOGL", name: "Alphabet Inc. Class A", weight: 9.41 },
      { symbol: "BAC", name: "Bank of America Corp.", weight: 9.2 },
      { symbol: "CVX", name: "Chevron Corp.", weight: 4.67 },
      { symbol: "OXY", name: "Occidental Petroleum Corp.", weight: 4.3 },
      { symbol: "CB", name: "Chubb Ltd.", weight: 3.9 },
      { symbol: "MCO", name: "Moody's Corp.", weight: 3.73 },
      { symbol: "GOOG", name: "Alphabet Inc. Class C", weight: 3.21 },
      { symbol: "KHC", name: "Kraft Heinz Co.", weight: 2.57 },
      { symbol: "DVA", name: "DaVita Inc.", weight: 2.15 },
      { symbol: "DAL", name: "Delta Air Lines Inc.", weight: 1.79 },
      { symbol: "SIRI", name: "SiriusXM Holdings Inc.", weight: 1.23 },
      { symbol: "VRSN", name: "VeriSign Inc.", weight: 0.76 },
    ],
    otherWeight: 3.04,
  },
  {
    id: "sixty-forty",
    name: "Classic 60/40 (model)",
    kind: "model",
    description: "A textbook balanced model: 60% total US stock market, 40% investment-grade bonds. Illustrative, not a real fund.",
    asOf: "2026-10-27",
    asOfLabel: "Model allocation (static)",
    source: "Sentia illustrative model portfolio",
    holdings: [
      { symbol: "VTI", name: "Vanguard Total Stock Market ETF", weight: 60 },
      { symbol: "BND", name: "Vanguard Total Bond Market ETF", weight: 40 },
    ],
    otherWeight: 0,
  },
  {
    id: "three-fund",
    name: "Three-fund (model)",
    kind: "model",
    description: "The 'lazy' three-fund idea: US stocks, international stocks and bonds. Illustrative weights, not a real fund.",
    asOf: "2026-10-27",
    asOfLabel: "Model allocation (static)",
    source: "Sentia illustrative model portfolio",
    holdings: [
      { symbol: "VTI", name: "Vanguard Total Stock Market ETF", weight: 50 },
      { symbol: "VXUS", name: "Vanguard Total International Stock ETF", weight: 30 },
      { symbol: "BND", name: "Vanguard Total Bond Market ETF", weight: 20 },
    ],
    otherWeight: 0,
  },
];
