import { z } from "zod";

export const HoldingSchema = z.object({
  id: z.string().uuid(),
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(12)
    .regex(/^[A-Za-z.\-]+$/, "Invalid ticker symbol"),
  name: z.string().trim().min(1).max(80),
  shares: z.number().positive().max(1_000_000_000),
  avgCost: z.number().nonnegative().max(1_000_000),
  thesisId: z.string().uuid().optional(),
  createdAt: z.string().datetime(),
});

export const GoalSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(80),
  targetAmount: z.number().positive().max(1_000_000_000),
  currentAmount: z.number().nonnegative().max(1_000_000_000),
  deadline: z.string().max(32).optional(),
  createdAt: z.string().datetime(),
});

export const ThesisSchema = z.object({
  id: z.string().uuid(),
  symbol: z.string().trim().min(1).max(12),
  title: z.string().trim().min(1).max(100),
  rationale: z.string().trim().min(1).max(4000),
  risks: z.string().trim().max(2000).default(""),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CheckInSchema = z.object({
  id: z.string().uuid(),
  mood: z.enum(["calm", "confident", "anxious", "fomo", "uncertain"]),
  note: z.string().trim().max(500).default(""),
  createdAt: z.string().datetime(),
});

export const LessonProgressSchema = z.object({
  lessonId: z.string().min(1).max(64),
  completed: z.boolean(),
  completedAt: z.string().datetime().optional(),
});

export const GamificationSchema = z.object({
  xp: z.number().int().nonnegative().max(10_000_000),
  level: z.number().int().positive().max(1000),
  streak: z.number().int().nonnegative().max(10_000),
  lastActiveDate: z.string().max(32).nullable(),
  health: z.enum(["A", "B", "C", "D"]),
});

export const InvestorProfileSchema = z.object({
  type: z
    .enum([
      "unspecified",
      "builder",
      "guardian",
      "explorer",
      "strategist",
    ])
    .default("unspecified"),
  answeredAt: z.string().datetime().nullable(),
});

export const AppStateSchema = z.object({
  version: z.literal(1),
  cash: z.number().nonnegative().max(1_000_000_000),
  holdings: z.array(HoldingSchema).max(200),
  goals: z.array(GoalSchema).max(50),
  theses: z.array(ThesisSchema).max(100),
  checkIns: z.array(CheckInSchema).max(365),
  lessons: z.array(LessonProgressSchema).max(100),
  gamification: GamificationSchema,
  investor: InvestorProfileSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Holding = z.infer<typeof HoldingSchema>;
export type Goal = z.infer<typeof GoalSchema>;
export type Thesis = z.infer<typeof ThesisSchema>;
export type CheckIn = z.infer<typeof CheckInSchema>;
export type LessonProgress = z.infer<typeof LessonProgressSchema>;
export type Gamification = z.infer<typeof GamificationSchema>;
export type InvestorProfile = z.infer<typeof InvestorProfileSchema>;
export type AppState = z.infer<typeof AppStateSchema>;

export type Quote = {
  symbol: string;
  price: number;
  changePercent: number;
  previousClose: number;
  source: "live" | "demo";
};

export type MarketSnapshot = {
  status: "open" | "closed" | "demo";
  updatedAt: string;
  quotes: Quote[];
};
