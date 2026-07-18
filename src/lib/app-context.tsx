"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { AppState, MarketSnapshot, Quote } from "@/lib/types";
import {
  addCheckIn,
  addGoal,
  addHolding,
  addThesis,
  completeLesson,
  exportStateJson,
  importStateJson,
  removeHolding,
  resetState,
  setInvestorType,
} from "@/lib/storage";
import {
  getAppState,
  getServerAppState,
  replaceAppState,
  setAppState,
  subscribeAppState,
} from "@/lib/app-store";
import { summarizePortfolio, type PortfolioSummary } from "@/lib/portfolio";

type AppContextValue = {
  ready: boolean;
  state: AppState;
  market: MarketSnapshot | null;
  marketLoading: boolean;
  marketError: string | null;
  quotes: Quote[];
  summary: PortfolioSummary;
  refreshMarket: () => Promise<void>;
  addHoldingAction: (input: {
    symbol: string;
    name: string;
    shares: number;
    avgCost: number;
  }) => string | null;
  removeHoldingAction: (id: string) => void;
  addGoalAction: (input: {
    title: string;
    targetAmount: number;
    currentAmount: number;
    deadline?: string;
  }) => string | null;
  addThesisAction: (input: {
    symbol: string;
    title: string;
    rationale: string;
    risks: string;
  }) => string | null;
  addCheckInAction: (input: {
    mood: AppState["checkIns"][number]["mood"];
    note: string;
  }) => void;
  completeLessonAction: (lessonId: string) => void;
  setInvestorTypeAction: (type: AppState["investor"]["type"]) => void;
  resetAction: () => void;
  exportAction: () => string;
  importAction: (raw: string) => string | null;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(
    subscribeAppState,
    getAppState,
    getServerAppState,
  );
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const [market, setMarket] = useState<MarketSnapshot | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);

  const refreshMarket = useCallback(async () => {
    setMarketLoading(true);
    setMarketError(null);
    try {
      const symbols = Array.from(
        new Set(["VTI", "VXUS", "BND", "VOO", "QQQ", ...state.holdings.map((h) => h.symbol)]),
      ).join(",");
      const res = await fetch(`/api/market?symbols=${encodeURIComponent(symbols)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(res.status === 429 ? "Market rate limit reached" : "Market request failed");
      }
      const data = (await res.json()) as MarketSnapshot;
      setMarket(data);
    } catch (err) {
      setMarketError(err instanceof Error ? err.message : "Unable to load market data");
    } finally {
      setMarketLoading(false);
    }
  }, [state.holdings]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await refreshMarket();
    };
    void tick();
    const id = window.setInterval(() => void tick(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [ready, refreshMarket]);

  const value = useMemo<AppContextValue>(() => {
    const quotes = market?.quotes ?? [];
    const summary = summarizePortfolio(state, quotes);

    return {
      ready,
      state,
      market,
      marketLoading,
      marketError,
      quotes,
      summary,
      refreshMarket,
      addHoldingAction: (input) => {
        try {
          setAppState((prev) => addHolding(prev, input));
          return null;
        } catch (e) {
          return e instanceof Error ? e.message : "Unable to add holding";
        }
      },
      removeHoldingAction: (id) => setAppState((prev) => removeHolding(prev, id)),
      addGoalAction: (input) => {
        try {
          setAppState((prev) => addGoal(prev, input));
          return null;
        } catch (e) {
          return e instanceof Error ? e.message : "Unable to add goal";
        }
      },
      addThesisAction: (input) => {
        try {
          setAppState((prev) => addThesis(prev, input));
          return null;
        } catch (e) {
          return e instanceof Error ? e.message : "Unable to add thesis";
        }
      },
      addCheckInAction: (input) => setAppState((prev) => addCheckIn(prev, input)),
      completeLessonAction: (lessonId) =>
        setAppState((prev) => completeLesson(prev, lessonId)),
      setInvestorTypeAction: (type) => setAppState((prev) => setInvestorType(prev, type)),
      resetAction: () => replaceAppState(resetState()),
      exportAction: () => exportStateJson(state),
      importAction: (raw) => {
        try {
          replaceAppState(importStateJson(raw));
          return null;
        } catch (e) {
          return e instanceof Error ? e.message : "Import failed";
        }
      },
    };
  }, [ready, state, market, marketLoading, marketError, refreshMarket]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
