import { nameForSymbol } from "./market";
import { computeBuy, computeSell, round2 } from "./portfolio";
import { AppState, AppStateSchema, SCHEMA_VERSION, Thesis, Transaction, type Mood, type Settings } from "./types";
import { LIMITS } from "./validation";

export const STORAGE_KEY = "sentia.state.v2";
// Older keys read as a fallback so data from before the rebrand isn't lost.
export const LEGACY_STORAGE_KEYS = ["trellis.state.v2", "ainvestpro.state.v2"];
/** Where unreadable saved data is copied before a fresh workspace replaces it. */
export const UNREADABLE_BACKUP_KEY = "sentia.state.unreadable-backup";

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(): string {
  // Older mobile WebKit (iOS Safari < 15.4) lacks crypto.randomUUID.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex
    .slice(8, 10)
    .join("")}-${hex.slice(10, 16).join("")}`;
}

export function createInitialState(): AppState {
  const created = nowIso();
  const seedHoldings = [
    { symbol: "VTI", shares: 42, avgCost: 245.5 },
    { symbol: "VXUS", shares: 55, avgCost: 58.2 },
    { symbol: "BND", shares: 40, avgCost: 72.1 },
  ];
  // A starter thesis for each seeded holding so the demo shows the linkage
  // (and the "thesis coverage" insight) working out of the box.
  const seedTheses: Record<string, Pick<Thesis, "title" | "rationale" | "risks" | "conviction">> = {
    VTI: {
      title: "Own the entire US market",
      rationale:
        "A single low-cost fund that holds essentially every US public company. Broad diversification plus long-run earnings growth make it a durable core holding I can keep adding to through any cycle.",
      risks: "Market-wide drawdowns and stretches of weak US growth; it offers no shelter when the whole market falls.",
      conviction: 5,
    },
    VXUS: {
      title: "Diversify beyond the US",
      rationale:
        "Exposure to developed and emerging markets outside the US. It broadens the book and taps growth and valuations that don't move one-for-one with domestic stocks.",
      risks: "Currency swings, geopolitical risk, and periods where international equities lag the US.",
      conviction: 4,
    },
    BND: {
      title: "Ballast for the portfolio",
      rationale:
        "A broad US investment-grade bond fund held for stability and income. It dampens overall volatility and provides dry powder to rebalance into stocks when they fall.",
      risks: "Rising interest rates pressure bond prices, and real returns can be thin when inflation runs hot.",
      conviction: 3,
    },
  };

  const startingCash = 25_000;
  const investedCost = seedHoldings.reduce((sum, h) => sum + h.shares * h.avgCost, 0);
  const initialDeposit = round2(startingCash + investedCost);

  const transactions: Transaction[] = [
    {
      id: newId(),
      type: "deposit",
      amount: initialDeposit,
      cashAfter: initialDeposit,
      note: "Starting balance",
      createdAt: created,
    },
  ];

  // Build theses first so each holding can link to the appropriate one.
  const thesisIdBySymbol: Record<string, string> = {};
  const theses: Thesis[] = seedHoldings.map((h) => {
    const seed = seedTheses[h.symbol];
    const id = newId();
    thesisIdBySymbol[h.symbol] = id;
    return {
      id,
      symbol: h.symbol,
      title: seed.title,
      rationale: seed.rationale,
      risks: seed.risks,
      conviction: seed.conviction,
      createdAt: created,
      updatedAt: created,
    };
  });

  let runningCash = initialDeposit;
  const holdings = seedHoldings.map((h) => {
    const cost = round2(h.shares * h.avgCost);
    runningCash = round2(runningCash - cost);
    transactions.push({
      id: newId(),
      type: "buy",
      symbol: h.symbol,
      shares: h.shares,
      price: h.avgCost,
      amount: cost,
      cashAfter: runningCash,
      note: "Opening position",
      createdAt: created,
    });
    return {
      id: newId(),
      symbol: h.symbol,
      name: nameForSymbol(h.symbol),
      shares: h.shares,
      avgCost: h.avgCost,
      thesisId: thesisIdBySymbol[h.symbol],
      createdAt: created,
      updatedAt: created,
    };
  });

  return {
    version: SCHEMA_VERSION,
    profileName: "",
    onboardedAt: null,
    profileSetupAt: null,
    profile: { experience: null, focus: null, avatarColor: "#0d9488" },
    cash: runningCash,
    holdings,
    theses,
    transactions,
    watchlist: [],
    alerts: [],
    orders: [],
    snapshots: [],
    settings: { celebrations: true, haptics: true },
    achievements: { disciplineMilestone: null },
    replay: null,
    replayHistory: [],
    leagues: [],
    createdAt: created,
    updatedAt: created,
  };
}

/** Stamp updatedAt after every mutation. */
export function commit(state: AppState): AppState {
  return { ...state, updatedAt: nowIso() };
}

export function pushTransaction(transactions: Transaction[], tx: Transaction): Transaction[] {
  const next = [...transactions, tx];
  if (next.length > LIMITS.maxTransactions) {
    return next.slice(next.length - LIMITS.maxTransactions);
  }
  return next;
}

// ---- Cash ----------------------------------------------------------------

export function deposit(state: AppState, amount: number, note = ""): AppState {
  const value = round2(amount);
  if (!Number.isFinite(value) || value <= 0) throw new Error("Deposit must be a positive amount.");
  const cash = round2(state.cash + value);
  if (cash > LIMITS.maxMoney) throw new Error("That deposit would exceed the maximum balance.");
  const tx: Transaction = {
    id: newId(),
    type: "deposit",
    amount: value,
    cashAfter: cash,
    note,
    createdAt: nowIso(),
  };
  return commit({ ...state, cash, transactions: pushTransaction(state.transactions, tx) });
}

export function withdraw(state: AppState, amount: number, note = ""): AppState {
  const value = round2(amount);
  if (value <= 0) throw new Error("Withdrawal must be a positive amount.");
  if (value > state.cash + 1e-9) throw new Error("Not enough cash to withdraw that amount.");
  const cash = round2(state.cash - value);
  const tx: Transaction = {
    id: newId(),
    type: "withdraw",
    amount: value,
    cashAfter: cash,
    note,
    createdAt: nowIso(),
  };
  return commit({ ...state, cash, transactions: pushTransaction(state.transactions, tx) });
}

// ---- Trading -------------------------------------------------------------

/** Optional context recorded on a trade (v4): the user's mood and the symbol's day change. */
export type TradeMeta = { mood?: Mood; dayChange?: number };

function metaFields(meta: TradeMeta | undefined): Pick<Transaction, "mood" | "dayChange"> {
  const out: Pick<Transaction, "mood" | "dayChange"> = {};
  if (meta?.mood) out.mood = meta.mood;
  if (meta?.dayChange !== undefined && Number.isFinite(meta.dayChange)) out.dayChange = Math.round(meta.dayChange * 100) / 100;
  return out;
}

export function buy(
  state: AppState,
  input: { symbol: string; shares: number; price: number },
  note = "",
  meta?: TradeMeta,
): AppState {
  const now = nowIso();
  const result = computeBuy(state, input, now, newId);
  const sym = input.symbol.trim().toUpperCase();
  // A brand-new position picks up the latest thesis already written for its symbol.
  const existingThesis = [...state.theses].reverse().find((t) => t.symbol.toUpperCase() === sym);
  if (existingThesis) {
    result.holdings = result.holdings.map((h) =>
      h.symbol.toUpperCase() === sym && !h.thesisId ? { ...h, thesisId: existingThesis.id } : h,
    );
  }
  const thesisId = result.holdings.find((h) => h.symbol.toUpperCase() === sym)?.thesisId;
  const tx: Transaction = {
    id: newId(),
    type: "buy",
    symbol: input.symbol.trim().toUpperCase(),
    shares: input.shares,
    price: input.price,
    amount: round2(input.shares * input.price),
    cashAfter: result.cash,
    note: note.slice(0, 200),
    ...metaFields(meta),
    ...(thesisId ? { thesisId } : {}),
    createdAt: now,
  };
  return commit({
    ...state,
    cash: result.cash,
    holdings: result.holdings,
    transactions: pushTransaction(state.transactions, tx),
  });
}

export function sell(
  state: AppState,
  input: { symbol: string; shares: number; price: number },
  note = "",
  meta?: TradeMeta,
): AppState {
  const now = nowIso();
  const thesisId = state.holdings.find((h) => h.symbol.toUpperCase() === input.symbol.trim().toUpperCase())?.thesisId;
  const result = computeSell(state, input, now);
  const tx: Transaction = {
    id: newId(),
    type: "sell",
    symbol: input.symbol.trim().toUpperCase(),
    shares: input.shares,
    price: input.price,
    amount: round2(input.shares * input.price),
    realizedGain: result.realizedGain,
    cashAfter: result.cash,
    note: note.slice(0, 200),
    ...metaFields(meta),
    ...(thesisId ? { thesisId } : {}),
    createdAt: now,
  };
  return commit({
    ...state,
    cash: result.cash,
    holdings: result.holdings,
    transactions: pushTransaction(state.transactions, tx),
  });
}

// ---- Theses --------------------------------------------------------------

export function addThesis(
  state: AppState,
  input: { symbol: string; title: string; rationale: string; risks?: string; conviction?: number },
): AppState {
  const now = nowIso();
  const thesis: Thesis = {
    id: newId(),
    symbol: input.symbol.trim().toUpperCase(),
    title: input.title.trim(),
    rationale: input.rationale.trim(),
    risks: (input.risks ?? "").trim(),
    conviction: input.conviction ?? 3,
    createdAt: now,
    updatedAt: now,
  };
  // Auto-link any matching holding that has no thesis yet.
  const holdings = state.holdings.map((h) =>
    h.symbol.toUpperCase() === thesis.symbol && !h.thesisId ? { ...h, thesisId: thesis.id, updatedAt: now } : h,
  );
  return commit({ ...state, theses: [...state.theses, thesis], holdings });
}

export function updateThesis(
  state: AppState,
  id: string,
  patch: Partial<Pick<Thesis, "title" | "rationale" | "risks" | "conviction">>,
): AppState {
  const theses = state.theses.map((thesis) =>
    thesis.id === id
      ? {
          ...thesis,
          ...(patch.title !== undefined && patch.title.trim() ? { title: patch.title.trim().slice(0, 100) } : {}),
          ...(patch.rationale !== undefined && patch.rationale.trim() ? { rationale: patch.rationale.trim().slice(0, 4000) } : {}),
          ...(patch.risks !== undefined ? { risks: patch.risks.trim().slice(0, 2000) } : {}),
          ...(patch.conviction !== undefined ? { conviction: Math.min(5, Math.max(1, Math.round(patch.conviction))) } : {}),
          updatedAt: nowIso(),
        }
      : thesis,
  );
  return commit({ ...state, theses });
}

export function removeThesis(state: AppState, id: string): AppState {
  const holdings = state.holdings.map((h) => (h.thesisId === id ? { ...h, thesisId: undefined, updatedAt: nowIso() } : h));
  // Its stress-test exit alert goes with it (same rule as clearing the stress test:
  // an alert still waiting is removed, a triggered one stays as history).
  const alertId = state.theses.find((t) => t.id === id)?.stressTest?.alertId;
  const alerts = alertId ? state.alerts.filter((a) => !(a.id === alertId && a.status === "active")) : state.alerts;
  return commit({ ...state, theses: state.theses.filter((t) => t.id !== id), holdings, alerts });
}

export function linkHoldingToThesis(state: AppState, holdingId: string, thesisId: string | undefined): AppState {
  const holdings = state.holdings.map((h) =>
    h.id === holdingId ? { ...h, thesisId: thesisId || undefined, updatedAt: nowIso() } : h,
  );
  return commit({ ...state, holdings });
}

// ---- Profile -------------------------------------------------------------

export function setProfileName(state: AppState, name: string): AppState {
  return commit({ ...state, profileName: name.trim().slice(0, 40) });
}

export function completeOnboarding(state: AppState): AppState {
  if (state.onboardedAt) return state;
  return commit({ ...state, onboardedAt: nowIso() });
}

export type ProfileInput = {
  name?: string;
  experience?: AppState["profile"]["experience"];
  focus?: AppState["profile"]["focus"];
  avatarColor?: string;
};

/** Save profile fields. Marks the profile as set up (once) so the wizard won't reappear. */
export function saveProfile(state: AppState, input: ProfileInput): AppState {
  const profile = {
    experience: input.experience !== undefined ? input.experience : state.profile.experience,
    focus: input.focus !== undefined ? input.focus : state.profile.focus,
    avatarColor: input.avatarColor ?? state.profile.avatarColor,
  };
  return commit({
    ...state,
    profileName: (input.name ?? state.profileName).trim().slice(0, 40),
    profile,
    profileSetupAt: state.profileSetupAt ?? nowIso(),
  });
}

// ---- v4: settings, milestones, leagues -------------------------------------

export function updateSettings(state: AppState, patch: Partial<Settings>): AppState {
  return commit({ ...state, settings: { ...state.settings, ...patch } });
}

/** Record the highest Discipline Score milestone reached (never moves down). */
export function recordDisciplineMilestone(state: AppState, milestone: number): AppState {
  const prev = state.achievements.disciplineMilestone;
  if (prev !== null && milestone <= prev) return state;
  return commit({ ...state, achievements: { ...state.achievements, disciplineMilestone: milestone } });
}

export function rememberLeague(state: AppState, code: string): AppState {
  if (state.leagues.includes(code)) return state;
  if (state.leagues.length >= LIMITS.maxLeagues) throw new Error(`You can be in up to ${LIMITS.maxLeagues} leagues.`);
  return commit({ ...state, leagues: [...state.leagues, code] });
}

export function forgetLeague(state: AppState, code: string): AppState {
  if (!state.leagues.includes(code)) return state;
  return commit({ ...state, leagues: state.leagues.filter((c) => c !== code) });
}

// ---- Persistence ---------------------------------------------------------

export function serializeState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function exportStateJson(state: AppState): string {
  return serializeState(state);
}

/** Accepts unknown data (e.g. an imported file, older localStorage, or a Firestore doc) and upgrades it. */
export function migrateUnknown(raw: unknown): AppState | null {
  const current = AppStateSchema.safeParse(raw);
  if (current.success) return current.data;

  if (raw && typeof raw === "object" && "version" in raw) {
    let data = raw as Record<string, unknown>;
    // Step through each migration in order: v1 → v2 → v3 → v4.
    if (data.version === 1) data = migrateV1(data);
    if (data.version === 2) data = migrateV2(data);
    if (data.version === 3) data = migrateV3(data);
    if (data.version === SCHEMA_VERSION) {
      const migrated = AppStateSchema.safeParse(data);
      if (migrated.success) return migrated.data;
    }
  }
  return null;
}

function migrateV1(v1: Record<string, unknown>): Record<string, unknown> {
  const nowFallback = nowIso();
  const holdings = Array.isArray(v1.holdings) ? v1.holdings : [];
  const theses = Array.isArray(v1.theses) ? v1.theses : [];

  // Fields no longer in the schema (goals, gamification, etc.) are stripped on parse.
  return {
    ...v1,
    version: 2,
    transactions: [],
    holdings: holdings.map((h) => {
      const holding = h as Record<string, unknown>;
      return { ...holding, updatedAt: holding.updatedAt ?? holding.createdAt ?? nowFallback };
    }),
    theses: theses.map((t) => {
      const thesis = t as Record<string, unknown>;
      return { ...thesis, conviction: thesis.conviction ?? 3 };
    }),
  };
}

/** v2 → v3: adds watchlist, price alerts, pending orders and performance snapshots (all empty). */
function migrateV2(v2: Record<string, unknown>): Record<string, unknown> {
  return {
    ...v2,
    version: 3,
    watchlist: Array.isArray(v2.watchlist) ? v2.watchlist : [],
    alerts: Array.isArray(v2.alerts) ? v2.alerts : [],
    orders: Array.isArray(v2.orders) ? v2.orders : [],
    snapshots: Array.isArray(v2.snapshots) ? v2.snapshots : [],
  };
}

/**
 * v3 → v4: adds settings (celebrations/haptics on), achievements (not yet
 * baselined), an empty Time Machine session/history and no leagues. Existing
 * trades simply have no mood/dayChange/thesisId and theses no stress test.
 */
function migrateV3(v3: Record<string, unknown>): Record<string, unknown> {
  return {
    ...v3,
    version: 4,
    settings: { celebrations: true, haptics: true },
    achievements: { disciplineMilestone: null },
    replay: null,
    replayHistory: [],
    leagues: [],
  };
}

/** Parse saved data; null when it is missing, not JSON, or not a readable Sentia state. */
export function parseStoredState(raw: string | null): AppState | null {
  if (!raw) return null;
  try {
    return migrateUnknown(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function loadStateFromString(raw: string | null): AppState {
  return parseStoredState(raw) ?? createInitialState();
}

export function importStateJson(raw: string): AppState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("That file isn't valid JSON. Choose a Sentia backup (.json) exported from Settings.");
  }
  const migrated = migrateUnknown(parsed);
  if (!migrated) throw new Error("This file is not a valid Sentia backup.");
  return migrated;
}
