export type Holding = {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  /** Last known price; refreshed via /api/quotes when available */
  lastPrice: number;
  assetClass: "equity" | "etf" | "cash" | "crypto";
};

export type Goal = {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  category: "retirement" | "home" | "vacation" | "education" | "other";
  createdAt: string;
};

export type Thesis = {
  id: string;
  symbol: string;
  title: string;
  thesis: string;
  conviction: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
  updatedAt: string;
};

export type MoodEntry = {
  id: string;
  mood: "calm" | "confident" | "anxious" | "fomo" | "neutral";
  note?: string;
  createdAt: string;
};

export type InvestorType =
  | "builder"
  | "guardian"
  | "explorer"
  | "tactician"
  | "unspecified";

export type LearnModule = {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  completed: boolean;
};

export type DailyStreak = {
  date: string; // YYYY-MM-DD
  checkIn: boolean;
  thesisOrLearn: boolean;
  goalReview: boolean;
  portfolioReview: boolean;
};

export type AppState = {
  version: 1;
  displayName: string;
  investorType: InvestorType;
  holdings: Holding[];
  goals: Goal[];
  theses: Thesis[];
  moods: MoodEntry[];
  learn: LearnModule[];
  streaks: DailyStreak[];
  xp: number;
  createdAt: string;
  updatedAt: string;
};
