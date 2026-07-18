import type { AppState } from "@/lib/types";

/** Seed portfolio calibrated to the original AInvestPro demo (~$20.9k). */
export function createDemoState(now = new Date()): AppState {
  const iso = now.toISOString();
  return {
    version: 1,
    displayName: "Investor",
    investorType: "unspecified",
    holdings: [
      {
        id: "h-voo",
        symbol: "VOO",
        name: "Vanguard S&P 500 ETF",
        shares: 18.4,
        avgCost: 449.26,
        lastPrice: 512.4,
        assetClass: "etf",
      },
      {
        id: "h-aapl",
        symbol: "AAPL",
        name: "Apple Inc.",
        shares: 29,
        avgCost: 179.86,
        lastPrice: 214.35,
        assetClass: "equity",
      },
      {
        id: "h-msft",
        symbol: "MSFT",
        name: "Microsoft Corp.",
        shares: 8,
        avgCost: 334.16,
        lastPrice: 428.1,
        assetClass: "equity",
      },
      {
        id: "h-cash",
        symbol: "USD",
        name: "Cash reserve",
        shares: 1840.68,
        avgCost: 1,
        lastPrice: 1,
        assetClass: "cash",
      },
    ],
    goals: [
      {
        id: "g-primary",
        title: "Primary portfolio goal",
        targetAmount: 25000,
        currentAmount: 20_909.79,
        category: "other",
        createdAt: iso,
      },
    ],
    theses: [],
    moods: [],
    learn: [
      {
        id: "l-cost-basis",
        title: "Cost basis & realized gain",
        summary: "Know what you paid so you can judge results without noise.",
        minutes: 4,
        completed: false,
      },
      {
        id: "l-thesis",
        title: "Write an investment thesis",
        summary: "Capture why you bought before emotions rewrite the story.",
        minutes: 5,
        completed: false,
      },
      {
        id: "l-risk",
        title: "Position sizing basics",
        summary: "Size holdings so one idea cannot sink the plan.",
        minutes: 6,
        completed: false,
      },
      {
        id: "l-behavior",
        title: "Behavioral traps",
        summary: "Spot FOMO, loss aversion, and revenge trading early.",
        minutes: 5,
        completed: false,
      },
    ],
    streaks: [],
    xp: 0,
    createdAt: iso,
    updatedAt: iso,
  };
}
