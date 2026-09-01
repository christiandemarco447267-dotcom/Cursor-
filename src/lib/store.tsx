"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { DEMO_UNIVERSE, demoQuote, demoSnapshot, marketStatusNow } from "./market";
import { portfolioSymbols, summarizePortfolio, type PortfolioSummary } from "./portfolio";
import * as mutations from "./storage";
import { LEGACY_STORAGE_KEYS, loadStateFromString, serializeState, STORAGE_KEY } from "./storage";
import type { AppState, MarketSnapshot, MarketStatus, Quote } from "./types";

// ---- Realtime market config ----------------------------------------------

// How often quotes auto-refresh (ms). Kept snappy so changes reflect promptly.
const MARKET_REFRESH_MS = 15_000;
// Optional public key for browser-side realtime quotes (works on static hosting).
const CLIENT_FINNHUB_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
// Set on the static export build so we skip the (non-existent) /api route.
const IS_STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Fetch realtime quotes directly from Finnhub in the browser (per-symbol graceful fallback). */
async function fetchClientQuotes(symbols: string[], key: string): Promise<MarketState> {
  const list = symbols.length ? symbols : DEMO_UNIVERSE.map((e) => e.symbol);
  const quotes: Quote[] = await Promise.all(
    list.map(async (symbol) => {
      try {
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { c?: number; pc?: number };
        if (!data.c || !data.pc) throw new Error("no data");
        const changePercent = ((data.c - data.pc) / data.pc) * 100;
        return {
          symbol,
          price: round2(data.c),
          previousClose: round2(data.pc),
          changePercent: round2(changePercent),
          source: "live" as const,
        };
      } catch {
        return demoQuote(symbol);
      }
    }),
  );
  const anyLive = quotes.some((q) => q.source === "live");
  return { status: anyLive ? marketStatusNow() : "demo", quotes, updatedAt: new Date().toISOString() };
}

// ---- Module store (single source of truth, survives re-renders) ----------

let current: AppState | null = null;
let initialized = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AppState | null {
  return current;
}

function getServerSnapshot(): AppState | null {
  return null;
}

function persist(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, serializeState(state));
  } catch {
    // Storage may be unavailable (private mode / quota). State still works in-memory.
  }
}

function setCurrent(next: AppState) {
  current = next;
  persist(next);
  emit();
}

function readStoredRaw(): string | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) return raw;
  // Fall back to a pre-rebrand key so existing data carries over.
  for (const key of LEGACY_STORAGE_KEYS) {
    const legacy = localStorage.getItem(key);
    if (legacy) return legacy;
  }
  return null;
}

function ensureInit() {
  if (initialized) return;
  initialized = true;
  current = loadStateFromString(readStoredRaw());
  persist(current); // normalize/migrate on disk (under the new key)
  emit();

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      current = loadStateFromString(event.newValue);
      emit();
    }
  });
}

/** Apply a mutation. Throws (without persisting) if the mutation rejects the action. */
function mutate(fn: (state: AppState) => AppState) {
  if (!current) throw new Error("Store not ready yet.");
  const next = fn(current);
  setCurrent(next);
}

// ---- Market -------------------------------------------------------------

export type MarketState = {
  status: MarketStatus | "loading" | "error";
  quotes: Quote[];
  updatedAt?: string;
  error?: string;
};

// ---- Context ------------------------------------------------------------

export type AppApi = {
  ready: boolean;
  state: AppState | null;
  summary: PortfolioSummary | null;
  market: MarketState;
  quotes: Quote[];
  tourOpen: boolean;
  openTour: () => void;
  closeTour: () => void;
  profileSetupOpen: boolean;
  openProfileSetup: () => void;
  closeProfileSetup: () => void;
  refreshMarket: () => void;
  actions: {
    buy: (input: { symbol: string; shares: number; price: number }) => void;
    sell: (input: { symbol: string; shares: number; price: number }) => void;
    deposit: (amount: number, note?: string) => void;
    withdraw: (amount: number, note?: string) => void;
    addGoal: (input: { title: string; targetAmount: number; currentAmount: number; deadline?: string }) => void;
    updateGoal: (id: string, patch: { title?: string; targetAmount?: number; deadline?: string }) => void;
    contributeToGoal: (id: string, delta: number) => void;
    removeGoal: (id: string) => void;
    addThesis: (input: { symbol: string; title: string; rationale: string; risks?: string; conviction?: number }) => void;
    updateThesis: (id: string, patch: { title?: string; rationale?: string; risks?: string; conviction?: number }) => void;
    removeThesis: (id: string) => void;
    linkHoldingToThesis: (holdingId: string, thesisId: string | undefined) => void;
    addCheckIn: (input: { mood: AppState["checkIns"][number]["mood"]; note?: string }) => void;
    completeLesson: (lessonId: string) => void;
    setInvestorType: (type: Exclude<AppState["investor"]["type"], "unspecified">) => void;
    setProfileName: (name: string) => void;
    saveProfile: (input: mutations.ProfileInput) => void;
    completeOnboarding: () => void;
    reset: () => void;
    importJson: (raw: string) => void;
    exportJson: () => string;
  };
};

const AppContext = createContext<AppApi | null>(null);

function requestSymbols(state: AppState | null): string[] {
  const universe = DEMO_UNIVERSE.map((entry) => entry.symbol);
  const held = state ? portfolioSymbols(state) : [];
  return Array.from(new Set([...held, ...universe])).slice(0, 20);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [market, setMarket] = useState<MarketState>({ status: "loading", quotes: [] });
  const [manualTourOpen, setManualTourOpen] = useState(false);
  const [manualProfileOpen, setManualProfileOpen] = useState(false);

  useEffect(() => {
    ensureInit();
  }, []);

  // First-run flow (all derived — no set-state-in-effect):
  // 1) brand-new users complete profile setup, then 2) the feature tour.
  const profileSetupOpen = manualProfileOpen || (Boolean(state) && !state?.profileSetupAt);
  const tourOpen =
    manualTourOpen || (Boolean(state) && Boolean(state?.profileSetupAt) && !state?.onboardedAt);

  const symbolsKey = requestSymbols(state).sort().join(",");

  // setState lives inside the promise callbacks (not synchronously in an effect),
  // which is the pattern React recommends for syncing with an external system.
  const refreshMarket = useCallback(() => {
    const symbols = symbolsKey ? symbolsKey.split(",") : [];
    const simulate = () => {
      const snapshot = demoSnapshot(symbols);
      setMarket({ status: "demo", quotes: snapshot.quotes, updatedAt: snapshot.updatedAt });
    };

    // Realtime path: a public market-data key lets the client fetch live quotes
    // directly (works even on static hosting). Falls back to the simulated feed.
    if (CLIENT_FINNHUB_KEY) {
      fetchClientQuotes(symbols, CLIENT_FINNHUB_KEY)
        .then((snapshot) => setMarket(snapshot))
        .catch(simulate);
      return;
    }

    // Static export has no /api route — skip the request and simulate directly.
    if (IS_STATIC_EXPORT) {
      simulate();
      return;
    }

    fetch(`/api/market?symbols=${encodeURIComponent(symbolsKey)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Market request failed (${res.status})`);
        return (await res.json()) as MarketSnapshot;
      })
      .then((snapshot) => {
        setMarket({ status: snapshot.status, quotes: snapshot.quotes, updatedAt: snapshot.updatedAt });
      })
      .catch(simulate);
  }, [symbolsKey]);

  useEffect(() => {
    if (!state) return;
    refreshMarket();
    const id = setInterval(refreshMarket, MARKET_REFRESH_MS);
    return () => clearInterval(id);
  }, [state, refreshMarket]);

  const summary = useMemo(() => (state ? summarizePortfolio(state, market.quotes) : null), [state, market.quotes]);

  const actions = useMemo<AppApi["actions"]>(
    () => ({
      buy: (input) => mutate((s) => mutations.buy(s, input)),
      sell: (input) => mutate((s) => mutations.sell(s, input)),
      deposit: (amount, note) => mutate((s) => mutations.deposit(s, amount, note)),
      withdraw: (amount, note) => mutate((s) => mutations.withdraw(s, amount, note)),
      addGoal: (input) => mutate((s) => mutations.addGoal(s, input)),
      updateGoal: (id, patch) => mutate((s) => mutations.updateGoal(s, id, patch)),
      contributeToGoal: (id, delta) => mutate((s) => mutations.contributeToGoal(s, id, delta)),
      removeGoal: (id) => mutate((s) => mutations.removeGoal(s, id)),
      addThesis: (input) => mutate((s) => mutations.addThesis(s, input)),
      updateThesis: (id, patch) => mutate((s) => mutations.updateThesis(s, id, patch)),
      removeThesis: (id) => mutate((s) => mutations.removeThesis(s, id)),
      linkHoldingToThesis: (holdingId, thesisId) => mutate((s) => mutations.linkHoldingToThesis(s, holdingId, thesisId)),
      addCheckIn: (input) => mutate((s) => mutations.addCheckIn(s, input)),
      completeLesson: (lessonId) => mutate((s) => mutations.completeLesson(s, lessonId)),
      setInvestorType: (type) => mutate((s) => mutations.setInvestorType(s, type)),
      setProfileName: (name) => mutate((s) => mutations.setProfileName(s, name)),
      saveProfile: (input) => mutate((s) => mutations.saveProfile(s, input)),
      completeOnboarding: () => mutate((s) => mutations.completeOnboarding(s)),
      reset: () => setCurrent(mutations.createInitialState()),
      importJson: (raw) => setCurrent(mutations.importStateJson(raw)),
      exportJson: () => (current ? mutations.exportStateJson(current) : "{}"),
    }),
    [],
  );

  const value: AppApi = {
    ready: Boolean(state),
    state,
    summary,
    market,
    quotes: market.quotes,
    tourOpen,
    openTour: () => setManualTourOpen(true),
    closeTour: () => setManualTourOpen(false),
    profileSetupOpen,
    openProfileSetup: () => setManualProfileOpen(true),
    closeProfileSetup: () => setManualProfileOpen(false),
    refreshMarket: () => void refreshMarket(),
    actions,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppApi {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within an AppProvider.");
  return ctx;
}
