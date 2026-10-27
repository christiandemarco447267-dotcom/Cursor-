import { z } from "zod";
import { LIMITS, SYMBOL_REGEX } from "./validation";

export const SCHEMA_VERSION = 4 as const;

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

// ---- v4: optional mood tag on trades -------------------------------------

export const MOODS = ["confident", "anxious", "bored", "excited", "calm"] as const;
export type Mood = (typeof MOODS)[number];

// ---- v4: thesis stress test ---------------------------------------------------

export const StressTestSchema = z.object({
  /** "What would prove this wrong?" */
  disproof: z.string().trim().min(1).max(LIMITS.risksMax),
  /** Optional exit trigger price, watched in the direction given. */
  exitPrice: z.number().positive().max(LIMITS.maxPrice).optional(),
  exitDirection: z.enum(["above", "below"]).default("below"),
  /** Free-text exit condition (e.g. "two quarters of falling margins"). */
  exitCondition: z.string().trim().max(300).default(""),
  /** Price alert created from this stress test, if any. */
  alertId: uuid.optional(),
  createdAt: isoDate,
});
export type StressTest = z.infer<typeof StressTestSchema>;

export const ThesisSchema = z.object({
  id: uuid,
  symbol: z.string().trim().min(1).max(LIMITS.symbolMax).regex(SYMBOL_REGEX, "Invalid ticker symbol"),
  title: z.string().trim().min(1).max(LIMITS.titleMax),
  rationale: z.string().trim().min(1).max(LIMITS.rationaleMax),
  risks: z.string().trim().max(LIMITS.risksMax).default(""),
  conviction: z.number().int().min(1).max(5).default(3),
  stressTest: StressTestSchema.optional(),
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
  /** v4: optional mood the user tagged the trade with. */
  mood: z.enum(MOODS).optional(),
  /** v4: the symbol's day change (%) when the trade was placed, if a quote was available (used by Bias Radar). */
  dayChange: z.number().min(-100).max(10_000).optional(),
  /** v4: thesis linked to the position at trade time (celebrations, share cards). */
  thesisId: uuid.optional(),
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

// ---- v4: Time Machine replay sessions (separate practice account) ---------------

export const ReplayTradeSchema = z.object({
  day: z.number().int().nonnegative().max(10_000),
  side: z.enum(ORDER_SIDES),
  symbol: symbolField,
  shares: z.number().positive().max(LIMITS.maxShares),
});
export type ReplayTrade = z.infer<typeof ReplayTradeSchema>;

export const ReplaySessionSchema = z.object({
  id: uuid,
  scenarioId: z.string().trim().min(1).max(40),
  startCash: z.number().positive().max(LIMITS.maxMoney),
  /** Index into the scenario's trading days (the "today" of the replay). */
  dayIndex: z.number().int().nonnegative().max(10_000),
  trades: z.array(ReplayTradeSchema).max(LIMITS.maxReplayTrades).default([]),
  startedAt: isoDate,
  finishedAt: isoDate.optional(),
});
export type ReplaySession = z.infer<typeof ReplaySessionSchema>;

export const ReplayResultSchema = z.object({
  scenarioId: z.string().trim().min(1).max(40),
  returnPct: z.number().min(-100).max(100_000),
  spyReturnPct: z.number().min(-100).max(100_000),
  maxDrawdownPct: z.number().min(0).max(100),
  trades: z.number().int().nonnegative(),
  finishedAt: isoDate,
});
export type ReplayResult = z.infer<typeof ReplayResultSchema>;

export const SettingsSchema = z.object({
  /** Confetti on wins and milestones (always skipped when the OS asks for reduced motion). */
  celebrations: z.boolean().default(true),
  /** Short vibration on supported phones. */
  haptics: z.boolean().default(true),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const AchievementsSchema = z.object({
  /** Highest Discipline Score milestone already recorded (null = not yet baselined). */
  disciplineMilestone: z.number().int().min(0).max(100).nullable().default(null),
});

export const LEAGUE_CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/;

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
  // v4
  settings: SettingsSchema.default({ celebrations: true, haptics: true }),
  achievements: AchievementsSchema.default({ disciplineMilestone: null }),
  replay: ReplaySessionSchema.nullable().default(null),
  replayHistory: z.array(ReplayResultSchema).max(LIMITS.maxReplayHistory).default([]),
  leagues: z.array(z.string().regex(LEAGUE_CODE_REGEX)).max(LIMITS.maxLeagues).default([]),
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
