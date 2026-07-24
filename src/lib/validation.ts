// Shared validation rules so the client forms and the persistence layer agree.
export const SYMBOL_REGEX = /^[A-Za-z][A-Za-z.\-]{0,11}$/;

export const LIMITS = {
  symbolMax: 12,
  nameMax: 80,
  titleMax: 100,
  noteMax: 500,
  rationaleMax: 4000,
  risksMax: 2000,
  maxShares: 1_000_000_000,
  maxMoney: 1_000_000_000,
  maxPrice: 1_000_000,
  maxHoldings: 200,
  maxGoals: 50,
  maxTheses: 100,
  maxCheckIns: 365,
  maxTransactions: 1000,
} as const;

export function normalizeSymbol(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidSymbol(raw: string): boolean {
  return SYMBOL_REGEX.test(raw.trim());
}

/** Parse a user-entered money/number string into a finite positive-or-zero number. */
export function parseAmount(raw: string): number | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return value;
}
