import { nameForSymbol } from "./market";
import { computeBuy, computeSell, round2 } from "./portfolio";
import { AppState, AppStateSchema, SCHEMA_VERSION, Thesis, Transaction } from "./types";
import { LIMITS } from "./validation";

export const STORAGE_KEY = "sentia.state.v2";
// Older keys read as a fallback so data from before the rebrand isn't lost.
export const LEGACY_STORAGE_KEYS = ["trellis.state.v2", "ainvestpro.state.v2"];

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
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
    theses: [],
    transactions,
    createdAt: created,
    updatedAt: created,
  };
}

/** Stamp updatedAt after every mutation. */
function commit(state: AppState): AppState {
  return { ...state, updatedAt: nowIso() };
}

function pushTransaction(transactions: Transaction[], tx: Transaction): Transaction[] {
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

export function buy(state: AppState, input: { symbol: string; shares: number; price: number }): AppState {
  const now = nowIso();
  const result = computeBuy(state, input, now, newId);
  const tx: Transaction = {
    id: newId(),
    type: "buy",
    symbol: input.symbol.trim().toUpperCase(),
    shares: input.shares,
    price: input.price,
    amount: round2(input.shares * input.price),
    cashAfter: result.cash,
    note: "",
    createdAt: now,
  };
  return commit({
    ...state,
    cash: result.cash,
    holdings: result.holdings,
    transactions: pushTransaction(state.transactions, tx),
  });
}

export function sell(state: AppState, input: { symbol: string; shares: number; price: number }): AppState {
  const now = nowIso();
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
    note: "",
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
          ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
          ...(patch.rationale !== undefined ? { rationale: patch.rationale.trim() } : {}),
          ...(patch.risks !== undefined ? { risks: patch.risks.trim() } : {}),
          ...(patch.conviction !== undefined ? { conviction: patch.conviction } : {}),
          updatedAt: nowIso(),
        }
      : thesis,
  );
  return commit({ ...state, theses });
}

export function removeThesis(state: AppState, id: string): AppState {
  const holdings = state.holdings.map((h) => (h.thesisId === id ? { ...h, thesisId: undefined, updatedAt: nowIso() } : h));
  return commit({ ...state, theses: state.theses.filter((t) => t.id !== id), holdings });
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

// ---- Persistence ---------------------------------------------------------

export function serializeState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function exportStateJson(state: AppState): string {
  return serializeState(state);
}

/** Accepts unknown data (e.g. an imported file or older localStorage) and upgrades it. */
export function migrateUnknown(raw: unknown): AppState | null {
  const current = AppStateSchema.safeParse(raw);
  if (current.success) return current.data;

  if (raw && typeof raw === "object" && "version" in raw) {
    const version = (raw as { version: unknown }).version;
    if (version === 1) {
      const migrated = AppStateSchema.safeParse(migrateV1(raw as Record<string, unknown>));
      if (migrated.success) return migrated.data;
    }
  }
  return null;
}

function migrateV1(v1: Record<string, unknown>): unknown {
  const nowFallback = nowIso();
  const holdings = Array.isArray(v1.holdings) ? v1.holdings : [];
  const theses = Array.isArray(v1.theses) ? v1.theses : [];

  // Fields no longer in the schema (goals, gamification, etc.) are stripped on parse.
  return {
    ...v1,
    version: SCHEMA_VERSION,
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

export function loadStateFromString(raw: string | null): AppState {
  if (!raw) return createInitialState();
  try {
    const parsed: unknown = JSON.parse(raw);
    const migrated = migrateUnknown(parsed);
    return migrated ?? createInitialState();
  } catch {
    return createInitialState();
  }
}

export function importStateJson(raw: string): AppState {
  const parsed: unknown = JSON.parse(raw);
  const migrated = migrateUnknown(parsed);
  if (!migrated) throw new Error("This file is not a valid Sentia backup.");
  return migrated;
}
