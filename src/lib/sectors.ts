// Static symbol → sector map used by the coach, Discipline Score and legend
// comparisons. Broad funds get their own buckets so "diversified" ETFs aren't
// mistaken for single-sector bets. Unknown symbols fall into "Other".
import { normalizeSymbol } from "./validation";

export const SECTORS = [
  "Technology",
  "Communication Services",
  "Consumer Discretionary",
  "Consumer Staples",
  "Financials",
  "Health Care",
  "Energy",
  "Industrials",
  "Materials",
  "Utilities",
  "Real Estate",
  "US Broad Market",
  "International",
  "Bonds",
  "Other",
] as const;
export type Sector = (typeof SECTORS)[number];

/** Funds that already spread money across many companies. */
export const BROAD_FUND_SECTORS: Sector[] = ["US Broad Market", "International", "Bonds"];

const MAP: Record<string, Sector> = {
  // Broad funds
  VTI: "US Broad Market", SPY: "US Broad Market", VOO: "US Broad Market", IVV: "US Broad Market",
  SCHD: "US Broad Market", DIA: "US Broad Market", IWM: "US Broad Market", RSP: "US Broad Market",
  VXUS: "International", VEA: "International", VWO: "International", EFA: "International", IXUS: "International",
  BND: "Bonds", AGG: "Bonds", TLT: "Bonds", IEF: "Bonds", SHY: "Bonds", BNDX: "Bonds", TIP: "Bonds",
  // Tech-heavy / thematic funds count as Technology exposure
  QQQ: "Technology", XLK: "Technology", VGT: "Technology", ARKK: "Technology", SMH: "Technology", SOXX: "Technology",
  // Technology
  AAPL: "Technology", MSFT: "Technology", NVDA: "Technology", AMD: "Technology", INTC: "Technology",
  AVGO: "Technology", ORCL: "Technology", CRM: "Technology", ADBE: "Technology", CSCO: "Technology",
  IBM: "Technology", QCOM: "Technology", TXN: "Technology", MU: "Technology", PLTR: "Technology",
  SHOP: "Technology", SNOW: "Technology", VRSN: "Technology", NOW: "Technology", TSM: "Technology",
  // Communication services
  GOOGL: "Communication Services", GOOG: "Communication Services", META: "Communication Services",
  NFLX: "Communication Services", DIS: "Communication Services", T: "Communication Services",
  VZ: "Communication Services", CMCSA: "Communication Services", SIRI: "Communication Services",
  NYT: "Communication Services", LLYVK: "Communication Services", CHTR: "Communication Services",
  // Consumer discretionary
  AMZN: "Consumer Discretionary", TSLA: "Consumer Discretionary", HD: "Consumer Discretionary",
  NKE: "Consumer Discretionary", MCD: "Consumer Discretionary", SBUX: "Consumer Discretionary",
  GME: "Consumer Discretionary", AMC: "Communication Services", LEN: "Consumer Discretionary",
  F: "Consumer Discretionary", GM: "Consumer Discretionary", LOW: "Consumer Discretionary",
  // Consumer staples
  KO: "Consumer Staples", PEP: "Consumer Staples", PG: "Consumer Staples", WMT: "Consumer Staples",
  COST: "Consumer Staples", KHC: "Consumer Staples", KR: "Consumer Staples", CL: "Consumer Staples",
  // Financials
  JPM: "Financials", BAC: "Financials", WFC: "Financials", C: "Financials", GS: "Financials",
  MS: "Financials", AXP: "Financials", V: "Financials", MA: "Financials", CB: "Financials",
  MCO: "Financials", ALLY: "Financials", "BRK.B": "Financials", "BRK-B": "Financials", PYPL: "Financials",
  XLF: "Financials", COF: "Financials", SCHW: "Financials",
  // Health care
  JNJ: "Health Care", UNH: "Health Care", PFE: "Health Care", LLY: "Health Care", MRK: "Health Care",
  ABBV: "Health Care", DVA: "Health Care", TMO: "Health Care", XLV: "Health Care",
  // Energy
  XOM: "Energy", CVX: "Energy", OXY: "Energy", COP: "Energy", SLB: "Energy", XLE: "Energy",
  // Industrials
  BA: "Industrials", CAT: "Industrials", GE: "Industrials", DAL: "Industrials", UPS: "Industrials",
  HON: "Industrials", LMT: "Industrials", UNP: "Industrials",
  // Materials / utilities / real estate
  LIN: "Materials", NUE: "Materials", NEE: "Utilities", DUK: "Utilities", SO: "Utilities",
  O: "Real Estate", PLD: "Real Estate", AMT: "Real Estate", VNQ: "Real Estate",
};

export function sectorOf(symbol: string): Sector {
  return MAP[normalizeSymbol(symbol)] ?? "Other";
}

export type SectorWeight = { sector: Sector; value: number; percent: number };

/** Sector weights of a set of positions (by market value). Percent of the positions' total. */
export function sectorWeights(positions: { symbol: string; value: number }[]): SectorWeight[] {
  const totals = new Map<Sector, number>();
  let sum = 0;
  for (const p of positions) {
    if (!(p.value > 0)) continue;
    const sector = sectorOf(p.symbol);
    totals.set(sector, (totals.get(sector) ?? 0) + p.value);
    sum += p.value;
  }
  return [...totals.entries()]
    .map(([sector, value]) => ({ sector, value, percent: sum > 0 ? (value / sum) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);
}
