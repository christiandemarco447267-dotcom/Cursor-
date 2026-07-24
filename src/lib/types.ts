import { z } from "zod";
import { LIMITS, SYMBOL_REGEX } from "./validation";

export const SCHEMA_VERSION = 2 as const;

const isoDate = z.string().datetime();
const uuid = z.string().uuid();

export const MOODS = ["calm", "confident", "anxious", "fomo", "uncertain"] as const;
export const INVESTOR_TYPES = ["builder", "guardian", "explorer", "strategist"] as const;
export const TRANSACTION_TYPES = ["buy", "sell", "deposit", "withdraw"] as const;
export const HEALTH_GRADES = ["A", "B", "C", "D"] as const;

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

export const GoalSchema = z.object({
  id: uuid,
  title: z.string().trim().min(1).max(LIMITS.nameMax),
  targetAmount: z.number().positive().max(LIMITS.maxMoney),
  currentAmount: z.number().nonnegative().max(LIMITS.maxMoney),
  deadline: z.string().max(32).optional(),
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type Goal = z.infer<typeof GoalSchema>;

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

export const CheckInSchema = z.object({
  id: uuid,
  mood: z.enum(MOODS),
  note: z.string().trim().max(LIMITS.noteMax).default(""),
  createdAt: isoDate,
});
export type CheckIn = z.infer<typeof CheckInSchema>;

export const LessonProgressSchema = z.object({
  lessonId: z.string().trim().min(1).max(64),
  completedAt: isoDate,
});
export type LessonProgress = z.infer<typeof LessonProgressSchema>;

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

export const GamificationSchema = z.object({
  xp: z.number().int().nonnegative().max(100_000_000),
  level: z.number().int().positive().max(10_000),
  streak: z.number().int().nonnegative().max(100_000),
  longestStreak: z.number().int().nonnegative().max(100_000),
  lastActiveDate: z.string().max(32).nullable(),
  health: z.enum(HEALTH_GRADES),
});
export type Gamification = z.infer<typeof GamificationSchema>;

export const InvestorProfileSchema = z.object({
  type: z.enum(["unspecified", ...INVESTOR_TYPES]).default("unspecified"),
  answeredAt: isoDate.nullable(),
});
export type InvestorType = z.infer<typeof InvestorProfileSchema>["type"];

export const AppStateSchema = z.object({
  version: z.literal(SCHEMA_VERSION),
  cash: z.number().nonnegative().max(LIMITS.maxMoney),
  holdings: z.array(HoldingSchema).max(LIMITS.maxHoldings),
  goals: z.array(GoalSchema).max(LIMITS.maxGoals),
  theses: z.array(ThesisSchema).max(LIMITS.maxTheses),
  checkIns: z.array(CheckInSchema).max(LIMITS.maxCheckIns),
  lessons: z.array(LessonProgressSchema).max(100),
  transactions: z.array(TransactionSchema).max(LIMITS.maxTransactions),
  gamification: GamificationSchema,
  investor: InvestorProfileSchema,
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
