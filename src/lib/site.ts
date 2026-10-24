// Canonical public URL of the deployed site. Change it in ONE place (or set
// NEXT_PUBLIC_SITE_URL at build time) after a repo rename or custom domain.
const DEFAULT_SITE_URL = "https://christiandemarco447267-dotcom.github.io/Cursor-/";

/** Absolute site URL, always ending in a single "/". */
export const SITE_URL = `${(process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "")}/`;

export const SITE_NAME = "Sentia";
export const SITE_TAGLINE = "Invest with process";
export const SITE_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const SITE_DESCRIPTION =
  "A focused paper-trading coach: real buy/sell simulation, portfolio and allocation tracking, investment theses, and portfolio-aware insights — with local-first, validated data.";

/** Build an absolute URL for a site path (e.g. "/app/trade") under SITE_URL. */
export function siteUrl(path = "/"): string {
  return new URL(path.replace(/^\/+/, ""), SITE_URL).toString();
}
