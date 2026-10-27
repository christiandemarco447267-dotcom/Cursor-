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
import { BENCHMARK_SYMBOL, DEMO_UNIVERSE, demoQuote, demoSnapshot, marketStatusNow } from "./market";
import * as alertOps from "./alerts";
import * as orderOps from "./orders";
import * as replayOps from "./time-machine";
import * as stressOps from "./stress-test";
import { celebrate } from "./celebrate";
import { formatCurrency, formatNumber } from "./format";
import { processMarketTick, type TickResult } from "./market-tick";
import { portfolioSymbols, summarizePortfolio, type PortfolioSummary } from "./portfolio";
import * as mutations from "./storage";
import { createInitialState, LEGACY_STORAGE_KEYS, loadStateFromString, serializeState, STORAGE_KEY } from "./storage";
import {
  AppStateSchema,
  type AppState,
  type MarketSnapshot,
  type MarketStatus,
  type Mood,
  type PriceAlert,
  type Quote,
  type ReplayResult,
  type Settings,
} from "./types";
import { friendlyAuthError } from "./auth-helpers";
import { AUTOSAVE_DEBOUNCE_MS, createDebouncedSaver, isRemoteNewer, type DebouncedSaver } from "./cloud-sync";
import { loadCloudState, saveCloudState, watchCloudState } from "./cloud-store";
import { normalizeSymbol } from "./validation";

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
//
// Two storage modes share one in-memory store:
//  - guest: local-first demo, persisted to localStorage on this device only.
//  - cloud: a signed-in account, persisted to Firestore at users/{uid}/state/current
//           with a debounced autosave on every change and live updates from other devices.

export type StorageMode = { kind: "guest" } | { kind: "cloud"; uid: string };
export type SyncStatus = "local" | "loading" | "saving" | "saved" | "error";
export type SyncState = { mode: StorageMode["kind"] | null; status: SyncStatus; error?: string };

let mode: StorageMode | null = null;
let generation = 0;
let current: AppState | null = null;
let sync: SyncState = { mode: null, status: "local" };
let saver: DebouncedSaver<AppState> | null = null;
let unwatch: (() => void) | null = null;
// Set when the cloud copy exists but can't be read, so autosave never overwrites it.
let cloudWritesBlocked = false;
let storageListenerInstalled = false;
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

function getSyncSnapshot(): SyncState {
  return sync;
}

// ---- Toasts (order fills, price alerts) ------------------------------------

export type ToastTone = "gain" | "loss" | "info";
export type Toast = { id: number; title: string; body: string; tone: ToastTone };

let toasts: Toast[] = [];
let toastSeq = 0;
const TOAST_TTL_MS = 9_000;
const MAX_TOASTS = 4;
const NO_TOASTS: Toast[] = [];

function getToastsSnapshot(): Toast[] {
  return toasts;
}
function getServerToastsSnapshot(): Toast[] {
  return NO_TOASTS;
}

export function dismissToast(id: number) {
  if (!toasts.some((t) => t.id === id)) return;
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function pushToast(toast: Omit<Toast, "id">) {
  toastSeq += 1;
  const id = toastSeq;
  toasts = [...toasts, { ...toast, id }].slice(-MAX_TOASTS);
  emit();
  setTimeout(() => dismissToast(id), TOAST_TTL_MS);
  // Mirror to a system notification when the user granted permission (best-effort).
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(toast.title, { body: toast.body, tag: `sentia-${id}` });
    }
  } catch {
    // Some mobile browsers only allow notifications from a service worker; the in-app toast still shows.
  }
}

// ---- Celebrations -----------------------------------------------------------

/** Confetti + haptics (per settings) with a matching toast. */
export function celebrateNow(title: string, body: string) {
  if (!current) return;
  pushToast({ title, body, tone: "gain" });
  celebrate(current.settings);
}

/** A profitable close of a position that was linked to a thesis deserves a moment. */
function celebrateThesisWins(prev: AppState, next: AppState) {
  if (next.transactions === prev.transactions) return;
  const seen = new Set(prev.transactions.map((t) => t.id));
  for (const tx of next.transactions) {
    if (seen.has(tx.id) || tx.type !== "sell" || !tx.thesisId || !((tx.realizedGain ?? 0) > 0)) continue;
    const thesis = next.theses.find((t) => t.id === tx.thesisId);
    celebrateNow("Thesis paid off", `${tx.symbol} closed for a ${formatCurrency(tx.realizedGain ?? 0)} gain${thesis ? ` — “${thesis.title}”` : ""}.`);
    break;
  }
}

function alertText(alert: PriceAlert): string {
  return `${alert.symbol} ${alert.direction === "above" ? "rose above" : "fell below"} ${formatCurrency(alert.price)}`;
}

function announceTick(result: TickResult) {
  for (const fill of result.fills) {
    const { order } = fill;
    const what = `${orderOps.orderLabel(order)} · ${formatNumber(order.shares)} ${order.symbol}`;
    if (fill.kind === "filled") {
      pushToast({ title: "Order filled", body: `${what} filled at ${formatCurrency(fill.price)}.`, tone: "gain" });
    } else {
      pushToast({ title: "Order rejected", body: `${what}: ${fill.reason}`, tone: "loss" });
    }
  }
  for (const { alert, price } of result.alerts) {
    pushToast({ title: "Price alert", body: `${alertText(alert)} (now ${formatCurrency(price)}).`, tone: "info" });
  }
}

/** Run the fill engine, alerts and snapshotting against the newest quotes. */
function applyMarketTick(quotes: Quote[]) {
  if (!current || quotes.length === 0) return;
  const result = processMarketTick(current, quotes, Date.now());
  if (!result.changed) return;
  const parsed = AppStateSchema.safeParse(result.state);
  if (!parsed.success) return; // never persist an invalid state; try again next tick
  const prev = current;
  setCurrent(parsed.data);
  announceTick(result);
  celebrateThesisWins(prev, parsed.data);
}

const SERVER_SYNC: SyncState = { mode: null, status: "local" };
function getServerSyncSnapshot(): SyncState {
  return SERVER_SYNC;
}

function setSync(next: Omit<SyncState, "mode">) {
  sync = { mode: mode?.kind ?? null, ...next };
  emit();
}

function persistLocal(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, serializeState(state));
  } catch {
    // Storage may be unavailable (private mode / quota). State still works in-memory.
  }
}

function persist(state: AppState) {
  if (mode?.kind === "cloud") {
    if (!cloudWritesBlocked) saver?.schedule(state);
    return;
  }
  persistLocal(state);
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

function installStorageListener() {
  if (storageListenerInstalled) return;
  storageListenerInstalled = true;
  // Cross-tab sync for guest mode (cloud mode syncs through Firestore instead).
  window.addEventListener("storage", (event) => {
    if (mode?.kind === "guest" && event.key === STORAGE_KEY) {
      current = loadStateFromString(event.newValue);
      emit();
    }
  });
}

function teardownCloud() {
  unwatch?.();
  unwatch = null;
  saver?.cancel();
  saver = null;
  cloudWritesBlocked = false;
}

function sameMode(a: StorageMode | null, b: StorageMode): boolean {
  if (!a || a.kind !== b.kind) return false;
  return a.kind === "guest" || (b.kind === "cloud" && a.uid === b.uid);
}

/** Switch the store to guest (localStorage) or a signed-in account (Firestore). */
function activate(next: StorageMode, force = false) {
  if (!force && sameMode(mode, next)) return;
  teardownCloud();
  generation += 1;
  const gen = generation;
  mode = next;

  if (next.kind === "guest") {
    current = loadStateFromString(readStoredRaw());
    persistLocal(current); // normalize/migrate on disk (under the new key)
    installStorageListener();
    setSync({ status: "local" });
    return;
  }

  const { uid } = next;
  current = null;
  setSync({ status: "loading" });
  saver = createDebouncedSaver<AppState>((state) => saveCloudState(uid, state), AUTOSAVE_DEBOUNCE_MS, {
    onStart: () => gen === generation && setSync({ status: "saving" }),
    onSuccess: () => gen === generation && !saver?.pending() && setSync({ status: "saved" }),
    onError: (error) => gen === generation && setSync({ status: "error", error: friendlyAuthError(error, "Couldn't save to the cloud. Your latest changes are kept in this tab; we'll retry on the next change.") }),
  });

  loadCloudState(uid)
    .then(({ exists, state }) => {
      if (gen !== generation) return;
      if (exists && !state) {
        // Never overwrite cloud data we can't read (e.g. written by a newer app version).
        cloudWritesBlocked = true;
        current = createInitialState();
        setSync({ status: "error", error: "Your saved account data couldn't be read by this version of Sentia, so changes here won't be saved. Try reloading." });
        return;
      }
      if (state) {
        current = state;
        setSync({ status: "saved" });
      } else {
        // First sign-in: start from this device's guest workspace (if any) so nothing is lost.
        const local = readStoredRaw();
        const seeded = local ? loadStateFromString(local) : createInitialState();
        current = seeded;
        setSync({ status: "saving" });
        saver?.schedule(seeded);
        void saver?.flush();
      }
      unwatch = watchCloudState(
        uid,
        (remote) => {
          if (gen !== generation || saver?.pending()) return;
          if (isRemoteNewer(remote, current)) {
            current = remote;
            emit();
          }
        },
        (error) => gen === generation && setSync({ status: "error", error: friendlyAuthError(error) }),
      );
    })
    .catch((error) => {
      if (gen !== generation) return;
      setSync({ status: "error", error: friendlyAuthError(error, "Couldn't load your account from the cloud.") });
    });
}

/** Retry loading the signed-in account after an error. */
export function retryCloudLoad() {
  if (mode) activate(mode, true);
}

/** Write any pending cloud change now (call before sign-out). */
export async function flushCloudSave(): Promise<void> {
  await saver?.flush();
}

/** Drop the in-memory account (after sign-out) so nothing leaks to the next session. */
export function deactivateStore() {
  teardownCloud();
  generation += 1;
  mode = null;
  current = null;
  sync = { mode: null, status: "local" };
  emit();
}

/**
 * Apply a mutation. Throws (without persisting) if the mutation rejects the
 * action, and validates the result against the schema so a bug can never
 * persist out-of-range/corrupt state (which would otherwise wipe data on reload).
 */
function mutate(fn: (state: AppState) => AppState) {
  if (!current) throw new Error("Store not ready yet.");
  const next = fn(current);
  const parsed = AppStateSchema.safeParse(next);
  if (!parsed.success) {
    throw new Error("That action was cancelled because it would exceed allowed limits.");
  }
  const prev = current;
  setCurrent(parsed.data);
  celebrateThesisWins(prev, parsed.data);
}

/** Advance the Time Machine; records the result and celebrates beating SPY at the end. */
function stepReplay(by: number | "end"): ReplayResult | null {
  let finished: ReplayResult | null = null;
  mutate((s) => {
    const r = replayOps.stepReplay(s, by);
    finished = r.finished;
    return r.state;
  });
  const done = finished as ReplayResult | null;
  if (done && done.returnPct > done.spyReturnPct) {
    celebrateNow("You beat the S&P 500", `Replay return ${done.returnPct.toFixed(1)}% vs SPY ${done.spyReturnPct.toFixed(1)}%.`);
  }
  return done;
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
  /** Where the paper account lives (guest = this device; cloud = the signed-in account) and save status. */
  sync: SyncState;
  tourOpen: boolean;
  openTour: () => void;
  closeTour: () => void;
  profileSetupOpen: boolean;
  openProfileSetup: () => void;
  closeProfileSetup: () => void;
  refreshMarket: () => void;
  /** In-app notifications for order fills and price alerts. */
  toasts: Toast[];
  dismissToast: (id: number) => void;
  actions: {
    buy: (input: TradeInput) => void;
    sell: (input: TradeInput) => void;
    placeOrder: (input: orderOps.OrderInput) => void;
    cancelOrder: (id: string) => void;
    clearClosedOrders: () => void;
    toggleWatch: (symbol: string) => void;
    addAlert: (input: alertOps.AlertInput) => void;
    removeAlert: (id: string) => void;
    deposit: (amount: number, note?: string) => void;
    withdraw: (amount: number, note?: string) => void;
    addThesis: (input: { symbol: string; title: string; rationale: string; risks?: string; conviction?: number }) => void;
    updateThesis: (id: string, patch: { title?: string; rationale?: string; risks?: string; conviction?: number }) => void;
    removeThesis: (id: string) => void;
    linkHoldingToThesis: (holdingId: string, thesisId: string | undefined) => void;
    setProfileName: (name: string) => void;
    saveProfile: (input: mutations.ProfileInput) => void;
    completeOnboarding: () => void;
    reset: () => void;
    importJson: (raw: string) => void;
    exportJson: () => string;
    // v4
    updateSettings: (patch: Partial<Settings>) => void;
    recordDisciplineMilestone: (milestone: number) => void;
    setStressTest: (thesisId: string, input: stressOps.StressTestInput) => void;
    clearStressTest: (thesisId: string) => void;
    startReplay: (scenarioId: string) => void;
    replayTrade: (input: replayOps.ReplayTradeInput) => void;
    stepReplay: (by: number | "end") => ReplayResult | null;
    endReplay: () => void;
    rememberLeague: (code: string) => void;
    forgetLeague: (code: string) => void;
  };
};

export type TradeInput = { symbol: string; shares: number; price: number; mood?: Mood; dayChange?: number };

const AppContext = createContext<AppApi | null>(null);

const MAX_REQUEST_SYMBOLS = 20;

/**
 * Symbols to quote, most important first. The network feed is capped at 20; the
 * local simulated feed has no cap, so every holding, order and alert gets a quote.
 */
export function requestSymbols(state: AppState | null, limit: number = MAX_REQUEST_SYMBOLS): string[] {
  const universe = DEMO_UNIVERSE.map((entry) => entry.symbol);
  if (!state) return universe.slice(0, limit);
  const held = portfolioSymbols(state);
  // Pending orders and active alerts must be quoted for the fill engine / alerts to work.
  const orderSymbols = state.orders.filter((o) => o.status === "open").map((o) => normalizeSymbol(o.symbol));
  const alertSymbols = state.alerts.filter((a) => a.status === "active").map((a) => normalizeSymbol(a.symbol));
  const watched = state.watchlist.map(normalizeSymbol);
  // Include thesis symbols so the market API returns a quote for every thesis,
  // even one written about a ticker that isn't currently held.
  const thesisSymbols = state.theses.map((t) => normalizeSymbol(t.symbol));
  return Array.from(
    new Set([BENCHMARK_SYMBOL, ...held, ...orderSymbols, ...alertSymbols, ...watched, ...thesisSymbols, ...universe]),
  ).slice(0, limit);
}

export function AppProvider({ mode: storageMode, children }: { mode: StorageMode; children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const syncState = useSyncExternalStore(subscribe, getSyncSnapshot, getServerSyncSnapshot);
  const toastList = useSyncExternalStore(subscribe, getToastsSnapshot, getServerToastsSnapshot);
  const [market, setMarket] = useState<MarketState>({ status: "loading", quotes: [] });
  const [manualTourOpen, setManualTourOpen] = useState(false);
  const [manualProfileOpen, setManualProfileOpen] = useState(false);

  const modeKey = storageMode.kind === "cloud" ? `cloud:${storageMode.uid}` : "guest";
  useEffect(() => {
    activate(modeKey === "guest" ? { kind: "guest" } : { kind: "cloud", uid: modeKey.slice("cloud:".length) });
  }, [modeKey]);

  // Don't lose the last debounced change when the tab is hidden or closed.
  useEffect(() => {
    const flush = () => void flushCloudSave();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // First-run flow (all derived — no set-state-in-effect):
  // 1) brand-new users complete profile setup, then 2) the feature tour.
  const profileSetupOpen = manualProfileOpen || (Boolean(state) && !state?.profileSetupAt);
  const tourOpen =
    manualTourOpen || (Boolean(state) && Boolean(state?.profileSetupAt) && !state?.onboardedAt);

  const symbolsKey = requestSymbols(state).sort().join(",");
  const allSymbolsKey = requestSymbols(state, Number.POSITIVE_INFINITY).sort().join(",");

  // setState lives inside the promise callbacks (not synchronously in an effect),
  // which is the pattern React recommends for syncing with an external system.
  const refreshMarket = useCallback(() => {
    const symbols = symbolsKey ? symbolsKey.split(",") : [];
    const simulate = () => {
      const snapshot = demoSnapshot(allSymbolsKey ? allSymbolsKey.split(",") : symbols);
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
  }, [symbolsKey, allSymbolsKey]);

  // Poll once state exists. Keyed on presence (not the state object) so ordinary
  // edits don't refetch quotes and restart the 15s timer; a new symbol to quote
  // changes refreshMarket and re-runs this effect.
  const hasState = Boolean(state);
  useEffect(() => {
    if (!hasState) return;
    refreshMarket();
    const id = setInterval(refreshMarket, MARKET_REFRESH_MS);
    return () => clearInterval(id);
  }, [hasState, refreshMarket]);

  // Each price update (and each state change, e.g. a newly placed order) runs the
  // fill engine, price alerts and performance snapshotting. Idempotent: reads and
  // writes the module store, so a re-run with the same quotes is a no-op.
  useEffect(() => {
    if (!state || market.quotes.length === 0) return;
    applyMarketTick(market.quotes);
  }, [state, market.quotes]);

  const summary = useMemo(() => (state ? summarizePortfolio(state, market.quotes) : null), [state, market.quotes]);

  const actions = useMemo<AppApi["actions"]>(
    () => ({
      buy: ({ mood, dayChange, ...input }) => mutate((s) => mutations.buy(s, input, "", { mood, dayChange })),
      sell: ({ mood, dayChange, ...input }) => mutate((s) => mutations.sell(s, input, "", { mood, dayChange })),
      placeOrder: (input) => mutate((s) => orderOps.placeOrder(s, input)),
      cancelOrder: (id) => mutate((s) => orderOps.cancelOrder(s, id)),
      clearClosedOrders: () => mutate((s) => orderOps.clearClosedOrders(s)),
      toggleWatch: (symbol) => mutate((s) => alertOps.toggleWatch(s, symbol)),
      addAlert: (input) => mutate((s) => alertOps.addAlert(s, input)),
      removeAlert: (id) => mutate((s) => alertOps.removeAlert(s, id)),
      deposit: (amount, note) => mutate((s) => mutations.deposit(s, amount, note)),
      withdraw: (amount, note) => mutate((s) => mutations.withdraw(s, amount, note)),
      addThesis: (input) => mutate((s) => mutations.addThesis(s, input)),
      updateThesis: (id, patch) => mutate((s) => mutations.updateThesis(s, id, patch)),
      removeThesis: (id) => mutate((s) => mutations.removeThesis(s, id)),
      linkHoldingToThesis: (holdingId, thesisId) => mutate((s) => mutations.linkHoldingToThesis(s, holdingId, thesisId)),
      setProfileName: (name) => mutate((s) => mutations.setProfileName(s, name)),
      saveProfile: (input) => mutate((s) => mutations.saveProfile(s, input)),
      completeOnboarding: () => mutate((s) => mutations.completeOnboarding(s)),
      reset: () => setCurrent(mutations.createInitialState()),
      importJson: (raw) => setCurrent(mutations.importStateJson(raw)),
      exportJson: () => (current ? mutations.exportStateJson(current) : "{}"),
      updateSettings: (patch) => mutate((s) => mutations.updateSettings(s, patch)),
      recordDisciplineMilestone: (m) => mutate((s) => mutations.recordDisciplineMilestone(s, m)),
      setStressTest: (thesisId, input) => mutate((s) => stressOps.setStressTest(s, thesisId, input)),
      clearStressTest: (thesisId) => mutate((s) => stressOps.clearStressTest(s, thesisId)),
      startReplay: (scenarioId) => mutate((s) => replayOps.startReplay(s, scenarioId)),
      replayTrade: (input) => mutate((s) => replayOps.replayTrade(s, input)),
      stepReplay,
      endReplay: () => mutate((s) => replayOps.endReplay(s)),
      rememberLeague: (code) => mutate((s) => mutations.rememberLeague(s, code)),
      forgetLeague: (code) => mutate((s) => mutations.forgetLeague(s, code)),
    }),
    [],
  );

  const value: AppApi = {
    ready: Boolean(state),
    state,
    summary,
    market,
    quotes: market.quotes,
    sync: syncState,
    tourOpen,
    openTour: () => setManualTourOpen(true),
    closeTour: () => setManualTourOpen(false),
    profileSetupOpen,
    openProfileSetup: () => setManualProfileOpen(true),
    closeProfileSetup: () => setManualProfileOpen(false),
    refreshMarket: () => void refreshMarket(),
    toasts: toastList,
    dismissToast,
    actions,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppApi {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within an AppProvider.");
  return ctx;
}
