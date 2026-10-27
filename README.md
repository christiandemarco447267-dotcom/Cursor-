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
document your reasoning.** The core screens are Portfolio, Trade, Markets, Watchlist,
Allocation, Theses, and Insights.

- **Real paper trading** — Buy and sell against a cash balance. Buys merge into a single
  lot with a **weighted-average cost basis**; sells realize P/L and credit cash. Every
  action is written to a transaction ledger (`/app/trade`).
- **Limit & stop orders** — Besides market orders, the Trade view places **buy-limit, sell-limit,
  buy-stop and sell-stop** orders. Open orders are listed with *Cancel*; a fill engine checks every price
  update and executes through the normal buy/sell logic at the market price. Cash/shares are re-checked at
  fill time: an order that can't be honoured is marked *rejected* with a note in the ledger.
- **You vs. S&P 500** — Sentia snapshots your total value and SPY (same feed) on every trade and at most every
  5 minutes while open, then charts both **indexed to 100** (time-weighted, so deposits don't count as gains)
  with your return, SPY's return, outperformance, max drawdown and win rate of closed trades (Portfolio +
  Home). History is capped at 500 points and thinned evenly, always keeping the starting point.
- **Watchlist + price alerts** — Star tickers in Markets or Trade; `/app/watchlist` shows live price/change and
  lets you add one-time **"above $X" / "below $X"** alerts. Each fires once (in-app toast, plus a browser
  notification if you allow it), then moves to *Triggered*. Alerts and orders are only checked while the app
  is open in a tab.
- **Investment theses** — Write, edit, and delete a thesis for each idea; holdings can be
  **linked to a thesis**, and Insights uses that link to keep you honest.
- **Realtime, auto-updating market data** — `/api/market` reports true `open`/`closed`
  status (US Eastern hours) and a live feed that refreshes automatically; add a Finnhub key
  for real quotes, or run on the built-in live simulation.
- **Portfolio-aware insights** — Concise coaching on diversification, concentration, cash,
  and thesis coverage, derived directly from your holdings.
- **Stable state** — Versioned (v3), Zod-validated schema with automatic migration (v1 → v2 → v3, for
  localStorage, imported backups and Firestore alike), cross-tab
  synchronization, and a local-first store. A short profile setup + optional onboarding
  tour help first-time users.
- **Mobile-friendly** — A clean top bar + slide-in navigation drawer on phones.

## Accounts & cloud sync (Firebase)

Optional user accounts are built on Firebase Auth + Firestore. With no Firebase config the app is guest-only,
exactly as before (the GitHub Pages demo stays this way).

- **Sign up / sign in / sign out / forgot password** (`/signup`, `/signin`, `/forgot-password`). New accounts must
  verify their email before the workspace opens (with a *Resend email* button).
- **Two-step verification (SMS)** in *Settings → Account & security*, using Firebase `multiFactor` +
  `PhoneAuthProvider` with invisible reCAPTCHA. Sign-in handles `auth/multi-factor-auth-required`. If SMS MFA
  isn't enabled on the project, the UI says so instead of failing.
- **Sensitive actions** (change password, change two-step settings, reset the cloud workspace) require a recent
  sign-in: confirm with your password (+ SMS code) or a one-time **email link** (`/auth/email-link`).
- **Cloud state** — the whole paper account (cash, holdings, ledger, theses, profile) is saved to Firestore at
  `users/{uid}/state/current` with a debounced autosave on every change, loaded on sign-in, and live-synced across
  tabs/devices. On first sign-in, this device's demo workspace becomes the account's starting point.
- **Demo mode** — "Continue in demo mode" keeps everything in `localStorage`, never touching Firestore.

### Setup

1. Create a Firebase project and a **Web app**; copy its config into `.env.local` (see `.env.example`,
   `NEXT_PUBLIC_FIREBASE_*`).
2. **Authentication → Sign-in method:** enable **Email/Password** and its **Email link (passwordless sign-in)** option.
3. **Authentication → Settings → Authorized domains:** add your Hosting domain(s) and `localhost`.
4. **Firestore:** create a database (production mode).
5. *Optional* **SMS two-step:** upgrade to **Identity Platform** (Blaze plan), then *Authentication → Sign-in method →
   Advanced → SMS Multi-factor Authentication → Enable*, and allow your SMS regions.
6. `firebase login` and `firebase use --add` (select the project; creates `.firebaserc`).

### Deploy to Firebase Hosting

```bash
firebase deploy --only hosting,firestore:rules
```

Hosting's `predeploy` runs `npm run build:firebase`, a static export (`output: "export"`) into `out/`. Static export
can't include the server-only `/api/market` + `/api/health` routes or `src/proxy.ts`, so the script parks them for
that build and restores them afterwards (the client already falls back to simulated / browser-side Finnhub quotes;
security headers come from `firebase.json`). Rules live in `firestore.rules` (owner-only access to `users/{uid}/**`,
verified email required).

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
| `npm run build:firebase` | Static export for Firebase Hosting (`out/`) |
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

In demo mode everything you enter stays in your browser (`localStorage`). Signed-in accounts store the paper
account in Firestore, readable and writable only by that user. See the in-app [Privacy](https://christiandemarco447267-dotcom.github.io/Cursor-/privacy/)
and [Terms](https://christiandemarco447267-dotcom.github.io/Cursor-/terms/) pages (`/privacy`, `/terms`).

## Disclaimer

Educational paper-trading software. Not investment advice and not a brokerage. No real money,
no brokerage integration. Prices are simulated unless a Finnhub key is configured.

## License

[MIT](LICENSE) © 2026 Christian DeMarco
