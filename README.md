# Sentia

[![CI](https://github.com/christiandemarco447267-dotcom/Cursor-/actions/workflows/ci.yml/badge.svg)](https://github.com/christiandemarco447267-dotcom/Cursor-/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/christiandemarco447267-dotcom/Cursor-/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/christiandemarco447267-dotcom/Cursor-/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-7c3aed.svg)](LICENSE)

**Live demo:** https://christiandemarco447267-dotcom.github.io/Cursor-/

**Sentia** is a stable, professional paper-trading coach — an educational, local-first
app for practicing a disciplined investing *process*. Not a brokerage and not investment
advice.

## A focused investing-practice tool

Sentia is deliberately streamlined around one loop: **buy and sell, track your book, and
document your reasoning.** The core screens are Portfolio, Trade, Markets, Allocation,
Theses, and Insights.

- **Real paper trading** — Buy and sell against a cash balance. Buys merge into a single
  lot with a **weighted-average cost basis**; sells realize P/L and credit cash. Every
  action is written to a transaction ledger (`/app/trade`).
- **Investment theses** — Write, edit, and delete a thesis for each idea; holdings can be
  **linked to a thesis**, and Insights uses that link to keep you honest.
- **Realtime, auto-updating market data** — `/api/market` reports true `open`/`closed`
  status (US Eastern hours) and a live feed that refreshes automatically; add a Finnhub key
  for real quotes, or run on the built-in live simulation.
- **Portfolio-aware insights** — Concise coaching on diversification, concentration, cash,
  and thesis coverage, derived directly from your holdings.
- **Stable state** — Versioned, Zod-validated schema with automatic migration, cross-tab
  synchronization, and a local-first store. A short profile setup + optional onboarding
  tour help first-time users.
- **Mobile-friendly** — A clean top bar + slide-in navigation drawer on phones.

## Try it from GitHub (no local setup)

**Option A — Live demo on GitHub Pages.** Once the *Deploy to GitHub Pages* workflow has
run (and Pages is set to “GitHub Actions” in repo settings), the app is available at:

> **https://christiandemarco447267-dotcom.github.io/Cursor-/**

This is a fully static, browser-only build (local-first data + client-side demo market
prices), so everything except live quotes works exactly like the dev server. Simulated
prices are always labelled with a small **Demo prices** badge.

**Option B — One click in GitHub Codespaces (full app, incl. the market API).**
On the repo page: **Code → Codespaces → Create codespace on this branch**. The container
runs `npm install` and `npm run dev` automatically and forwards port 3000 — open the
forwarded URL when it appears.

## Quick start (local)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then launch the workspace at `/app`.

Optional live quotes:

```bash
cp .env.example .env.local
# set FINNHUB_API_KEY=...
```

## Scripts

| Command            | Purpose               |
| ------------------ | --------------------- |
| `npm run dev`      | Local development     |
| `npm run build`    | Production build      |
| `npm run start`    | Serve production      |
| `npm run lint`     | ESLint                |
| `npm run typecheck`| TypeScript check      |
| `npm test`         | Unit tests            |
| `npm run og:image` | Regenerate `public/og-image.png` (social share image) |

## Continuous integration & deployment

- **CI** (`.github/workflows/ci.yml`) runs `npm ci`, typecheck, lint, tests, and a production
  build on every pull request and on pushes to `main` (Node 22).
- **Deploy** (`.github/workflows/deploy-pages.yml`) publishes a static export to GitHub Pages on
  every push to `main` (or manually via *Run workflow*).
- The canonical site URL used for metadata, the sitemap, and social cards lives in
  `src/lib/site.ts`. After a repo rename or custom domain, change it there (or set
  `NEXT_PUBLIC_SITE_URL` at build time).

## Architecture

- **`src/lib`** — framework-free domain logic: Zod schemas + migration (`types.ts`,
  `storage.ts`), valuation & trading (`portfolio.ts`), market data (`market.ts`),
  insights, profile helpers, and a `useSyncExternalStore`-based store (`store.tsx`).
- **`src/app`** — App Router pages (thin) + API routes (`/api/market`, `/api/health`).
- **`src/components`** — one client view component per screen plus shared UI primitives.
- **`src/proxy.ts`** — security headers (Next.js 16 `proxy` convention).

## Privacy & terms

Sentia has no accounts and no server-side storage: everything you enter stays in your browser
(`localStorage`). See the in-app [Privacy](https://christiandemarco447267-dotcom.github.io/Cursor-/privacy/)
and [Terms](https://christiandemarco447267-dotcom.github.io/Cursor-/terms/) pages (`/privacy`, `/terms`).

## Disclaimer

Educational paper-trading software. Not investment advice and not a brokerage. No real money,
no brokerage integration. Prices are simulated unless a Finnhub key is configured.

## License

[MIT](LICENSE) © 2026 Christian DeMarco
