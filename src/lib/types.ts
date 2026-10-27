import { z } from "zod";
import { LIMITS, SYMBOL_REGEX } from "./validation";

export const SCHEMA_VERSION = 3 as const;

const isoDate = z.string().datetime();
const uuid = z.string().uuid();

// "order" is an informational ledger entry (e.g. a pending order rejected at fill time); it moves no money.
export const TRANSACTION_TYPES = ["buy", "sell", "deposit", "withdraw", "order"] as const;

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

const symbolField = z.string().trim().min(1).max(LIMITS.symbolMax).regex(SYMBOL_REGEX, "Invalid ticker symbol");

// ---- v3: watchlist + price alerts ----------------------------------------

export const ALERT_DIRECTIONS = ["above", "below"] as const;
export const ALERT_STATUSES = ["active", "triggered"] as const;

export const PriceAlertSchema = z.object({
  id: uuid,
  symbol: symbolField,
  direction: z.enum(ALERT_DIRECTIONS),
  price: z.number().positive().max(LIMITS.maxPrice),
  status: z.enum(ALERT_STATUSES).default("active"),
  createdAt: isoDate,
  triggeredAt: isoDate.optional(),
  triggeredPrice: z.number().nonnegative().max(LIMITS.maxPrice).optional(),
});
export type PriceAlert = z.infer<typeof PriceAlertSchema>;

// ---- v3: pending limit / stop orders --------------------------------------

export const ORDER_SIDES = ["buy", "sell"] as const;
export const ORDER_TYPES = ["limit", "stop"] as const;
export const ORDER_STATUSES = ["open", "filled", "cancelled", "rejected"] as const;

export const PendingOrderSchema = z.object({
  id: uuid,
  symbol: symbolField,
  side: z.enum(ORDER_SIDES),
  type: z.enum(ORDER_TYPES),
  shares: z.number().positive().max(LIMITS.maxShares),
  /** Limit price (limit orders) or stop/trigger price (stop orders). */
  triggerPrice: z.number().positive().max(LIMITS.maxPrice),
  status: z.enum(ORDER_STATUSES).default("open"),
  createdAt: isoDate,
  updatedAt: isoDate,
  filledAt: isoDate.optional(),
  fillPrice: z.number().nonnegative().max(LIMITS.maxPrice).optional(),
  reason: z.string().trim().max(200).optional(),
});
export type PendingOrder = z.infer<typeof PendingOrderSchema>;

// ---- v3: performance snapshots (portfolio vs. SPY) -------------------------

export const PerfSnapshotSchema = z.object({
  t: isoDate,
  /** Total portfolio value (cash + positions at market). */
  value: z.number().nonnegative().max(LIMITS.maxMoney * 10),
  /** SPY price at the same moment, from the same market feed. */
  spy: z.number().positive().max(LIMITS.maxPrice),
  /** Net external cash flow (deposits − withdrawals) since the previous snapshot. */
  flow: z.number().min(-LIMITS.maxMoney).max(LIMITS.maxMoney).default(0),
});
export type PerfSnapshot = z.infer<typeof PerfSnapshotSchema>;

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
  watchlist: z.array(symbolField).max(LIMITS.maxWatchlist).default([]),
  alerts: z.array(PriceAlertSchema).max(LIMITS.maxAlerts).default([]),
  orders: z.array(PendingOrderSchema).max(LIMITS.maxOrders).default([]),
  snapshots: z.array(PerfSnapshotSchema).max(LIMITS.maxSnapshots).default([]),
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
