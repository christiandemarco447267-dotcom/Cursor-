// In-app feedback: payload building, validation and the no-API fallback links (pure parts unit-tested).
import { apiConfigured, apiUrl, APP_VERSION } from "./api-config";
import { formatCurrency, formatNumber } from "./format";
import type { PortfolioSummary } from "./portfolio";

export const FEEDBACK_KINDS = [
  { key: "bug", label: "Bug", emoji: "🐞" },
  { key: "idea", label: "Idea", emoji: "💡" },
  { key: "praise", label: "Praise", emoji: "🎉" },
] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]["key"];

export const FEEDBACK_MAX = 2000;
/** Optional public contact address for the no-API fallback (repo variable NEXT_PUBLIC_FEEDBACK_EMAIL). Never hardcoded. */
export const FEEDBACK_EMAIL = (process.env.NEXT_PUBLIC_FEEDBACK_EMAIL ?? "").trim();
export const GITHUB_ISSUES_URL = "https://github.com/christiandemarco447267-dotcom/Cursor-/issues/new";

export type FeedbackContext = {
  page?: string;
  appVersion?: string;
  viewport?: string;
  userAgent?: string;
  dataSource?: string;
  portfolio?: string;
};

export type FeedbackInput = {
  type: FeedbackKind | "survey";
  message: string;
  email?: string;
  rating?: number;
  /** Honeypot (must stay empty). */
  website?: string;
  context?: FeedbackContext;
};

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

export function validateFeedbackInput(input: FeedbackInput): string | null {
  const message = input.message.trim();
  if (input.type !== "survey" && message.length < 3) return "Please write a short message.";
  if (message.length > FEEDBACK_MAX) return `Please keep it under ${FEEDBACK_MAX} characters.`;
  if (input.email && !EMAIL_RE.test(input.email.trim())) return "That email doesn't look right (or leave it blank).";
  if (input.type === "survey" && !(input.rating && input.rating >= 1 && input.rating <= 5)) return "Pick a rating from 1 to 5.";
  return null;
}

/** Non-identifying context. Portfolio numbers only when the user explicitly opts in. */
export function buildFeedbackContext(opts: {
  page: string;
  viewport: string;
  userAgent?: string;
  dataSource: string;
  includePortfolio: boolean;
  summary?: PortfolioSummary | null;
}): FeedbackContext {
  const ctx: FeedbackContext = {
    page: opts.page.slice(0, 200),
    appVersion: APP_VERSION,
    viewport: opts.viewport,
    dataSource: opts.dataSource,
  };
  if (opts.userAgent) ctx.userAgent = opts.userAgent.slice(0, 200);
  if (opts.includePortfolio && opts.summary) {
    const s = opts.summary;
    const holdings = s.holdings
      .slice(0, 15)
      .map((h) => `${h.symbol} ${formatNumber(h.shares)}`)
      .join(", ");
    ctx.portfolio = `Total ${formatCurrency(s.total)}; cash ${formatCurrency(s.cash)}; ${s.holdings.length} holdings${holdings ? ` (${holdings})` : ""}`.slice(0, 1500);
  }
  return ctx;
}

function contextLines(ctx?: FeedbackContext): string {
  if (!ctx) return "";
  return Object.entries(ctx)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

/** Prefilled email for builds without the Sentia API. */
export function mailtoLink(input: FeedbackInput, to: string = FEEDBACK_EMAIL): string | null {
  if (!EMAIL_RE.test(to)) return null;
  const subject = `Sentia ${input.type}${input.rating ? ` (${input.rating}/5)` : ""}`;
  const extra = contextLines(input.context);
  const body = `${input.message.trim()}${extra ? `\n\n---\n${extra}` : ""}`.slice(0, 1800);
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Prefilled GitHub issue (public!) for builds without the Sentia API. */
export function githubIssueLink(input: FeedbackInput): string {
  const title = `[${input.type}] ${input.message.trim().split("\n")[0]?.slice(0, 70) ?? "Feedback"}`;
  const extra = contextLines({ ...input.context, portfolio: undefined, userAgent: undefined });
  const body = `${input.message.trim()}${extra ? `\n\n---\n${extra}` : ""}`.slice(0, 1800);
  return `${GITHUB_ISSUES_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

export function feedbackApiAvailable(): boolean {
  return apiConfigured();
}

export async function sendFeedback(input: FeedbackInput): Promise<void> {
  const res = await fetch(apiUrl("/feedback"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "omit",
    body: JSON.stringify({ ...input, message: input.message.trim(), email: input.email?.trim() || undefined }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    let msg = `Couldn't send (error ${res.status}).`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) msg = body.error;
    } catch {
      // keep generic message
    }
    throw new Error(msg);
  }
}
