import { z } from "zod";
import { LIMITS, SYMBOL_REGEX } from "./validation";

export const SCHEMA_VERSION = 2 as const;

const isoDate = z.string().datetime();
const uuid = z.string().uuid();

export const TRANSACTION_TYPES = ["buy", "sell", "deposit", "withdraw"] as const;

export const HoldingSchema = z.object({
  id: uuid,
  symbol: z.string().trim().min(1).max(LIMITS.symbolMax).regex(SYMBOL_REGEX, "Invalid ticker symbol"),
  name: z.string().trim().min(1).max(LIMITS.nameMax),
  shares: z.number().positive().max(LIMITS.maxShares),
  avgCost: z.number().nonnegative().max(LIMITS.maxPrice),
  thesisId: uuid.optional(),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type Holding = z.infer<typeof HoldingSchema>;

export const ThesisSchema = z.object({
  id: uuid,
  symbol: z.string().trim().min(1).max(LIMITS.symbolMax).regex(SYMBOL_REGEX, "Invalid ticker symbol"),
  title: z.string().trim().min(1).max(LIMITS.titleMax),
  rationale: z.string().trim().min(1).max(LIMITS.rationaleMax),
  risks: z.string().trim().max(LIMITS.risksMax).default(""),
  conviction: z.number().int().min(1).max(5).default(3),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type Thesis = z.infer<typeof ThesisSchema>;

export const TransactionSchema = z.object({
  id: uuid,
  type: z.enum(TRANSACTION_TYPES),
  symbol: z.string().trim().min(1).max(LIMITS.symbolMax).optional(),
  shares: z.number().positive().max(LIMITS.maxShares).optional(),
  price: z.number().nonnegative().max(LIMITS.maxPrice).optional(),
  amount: z.number().nonnegative().max(LIMITS.maxMoney),
  realizedGain: z.number().optional(),
  cashAfter: z.number().nonnegative().max(LIMITS.maxMoney),
  note: z.string().trim().max(200).default(""),
  createdAt: isoDate,
});
export type Transaction = z.infer<typeof TransactionSchema>;

export const EXPERIENCE_LEVELS = ["new", "some", "experienced"] as const;
export const FOCUS_AREAS = ["learn", "discipline", "growth", "explore"] as const;

export const ProfileSchema = z.object({
  experience: z.enum(EXPERIENCE_LEVELS).nullable().default(null),
  focus: z.enum(FOCUS_AREAS).nullable().default(null),
  avatarColor: z.string().trim().max(9).default("#0d9488"),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const AppStateSchema = z.object({
  version: z.literal(SCHEMA_VERSION),
  profileName: z.string().trim().max(40).default(""),
  onboardedAt: isoDate.nullable().default(null),
  profileSetupAt: isoDate.nullable().default(null),
  profile: ProfileSchema.default({ experience: null, focus: null, avatarColor: "#0d9488" }),
  cash: z.number().nonnegative().max(LIMITS.maxMoney),
  holdings: z.array(HoldingSchema).max(LIMITS.maxHoldings),
  theses: z.array(ThesisSchema).max(LIMITS.maxTheses),
  transactions: z.array(TransactionSchema).max(LIMITS.maxTransactions),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type AppState = z.infer<typeof AppStateSchema>;

// Market data (never persisted).
export type QuoteSource = "live" | "demo";

export type Quote = {
  symbol: string;
  price: number;
  changePercent: number;
  previousClose: number;
  source: QuoteSource;
  error?: string;
};

export type MarketStatus = "open" | "closed" | "demo";

export type MarketSnapshot = {
  status: MarketStatus;
  updatedAt: string;
  quotes: Quote[];
};
