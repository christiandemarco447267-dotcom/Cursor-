// Canonical public URL of the deployed site, resolved at build time:
//   1. NEXT_PUBLIC_SITE_URL (custom domain, or what the deploy workflow passes in);
//   2. otherwise https://<owner>.github.io<base path>/ derived from the GitHub
//      repository (GITHUB_REPOSITORY_OWNER, set on Actions runners) and the Pages
//      base path the workflow builds with (PAGES_BASE_PATH / NEXT_PUBLIC_BASE_PATH);
//   3. otherwise the default below.
// So a repo rename (e.g. Sentia- → Cursor-) needs no code change.
const DEFAULT_OWNER = "christiandemarco447267-dotcom";
const DEFAULT_BASE_PATH = "/Cursor-";

/** Normalize a base path to "" or "/segment" (leading slash, no trailing slash). */
export function normalizeBasePath(value: string | undefined): string {
  const trimmed = (value ?? "").trim().replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}` : "";
}

/** Resolve the canonical site URL from build-time environment variables (pure; unit-tested). */
export function resolveSiteUrl(env: Record<string, string | undefined>): string {
  const explicit = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return `${explicit.replace(/\/+$/, "")}/`;
  const owner = (env.GITHUB_REPOSITORY_OWNER || env.GITHUB_REPOSITORY?.split("/")[0] || DEFAULT_OWNER).toLowerCase();
  const fromRepo = env.GITHUB_REPOSITORY?.split("/")[1];
  const basePath = normalizeBasePath(env.PAGES_BASE_PATH || env.NEXT_PUBLIC_BASE_PATH || (fromRepo ? `/${fromRepo}` : DEFAULT_BASE_PATH));
  return `https://${owner}.github.io${basePath}/`;
}

/** Absolute site URL, always ending in a single "/". */
export const SITE_URL = resolveSiteUrl({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  GITHUB_REPOSITORY_OWNER: process.env.GITHUB_REPOSITORY_OWNER,
  GITHUB_REPOSITORY: process.env.GITHUB_REPOSITORY,
  PAGES_BASE_PATH: process.env.PAGES_BASE_PATH,
  NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH,
});

export const SITE_NAME = "Sentia";
export const SITE_TAGLINE = "Invest with process";
export const SITE_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const SITE_DESCRIPTION =
  "A focused paper-trading coach: real buy/sell simulation, portfolio and allocation tracking, investment theses, and portfolio-aware insights — with local-first, validated data.";

/** Build an absolute URL for a site path (e.g. "/app/trade") under SITE_URL. */
export function siteUrl(path = "/"): string {
  return new URL(path.replace(/^\/+/, ""), SITE_URL).toString();
}


/** The one-line disclaimer shown at onboarding, in Settings → About, and in store listings. */
export const SIM_DISCLAIMER = "Simulated paper trading. No real money. Not investment advice.";

/** Public web pages the app stores ask for (privacy policy URL, account-deletion URL, support URL). */
export const PUBLIC_PAGES = {
  privacy: "/privacy/",
  terms: "/terms/",
  support: "/support/",
  deleteAccount: "/delete-account/",
} as const;
