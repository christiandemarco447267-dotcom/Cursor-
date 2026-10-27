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
Allocation, Theses, and Insights, plus coaching and practice tools: Discipline Score, Bias Radar,
Ask Sentia, Legend portfolios, the Time Machine and friend leagues.

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
- **Stable state** — Versioned (v4), Zod-validated schema with automatic migration (v1 → v2 → v3 → v4, for
  localStorage, imported backups and Firestore alike; every new field is defaulted), cross-tab
  synchronization, and a local-first store. A short profile setup + optional onboarding
  tour help first-time users.
- **Mobile-friendly** — A clean top bar + slide-in navigation drawer on phones.

### Coaching & practice features

All coaching text is educational, rule-based and computed on-device. None of it is investment advice.

- **Discipline Score (0–100)** — A *process* score shown on Home and Insights with a breakdown of five
  equally weighted parts (20 pts each): thesis coverage, position sizing (full credit when no position is
  above ~25% of the portfolio, none at 50%+), diversification (holdings + sectors; broad funds count extra),
  biases avoided (last 30 days) and alerts/stops usage (active alert, open sell-stop or stress-test exit per
  holding). `src/lib/discipline.ts`.
- **Bias Radar** — Flags FOMO buys (≥ +3% day, or a fresh recent high ≥5% above your recent fills), revenge
  trades (a buy within 24h of a realized loss), panic sells (a loss on a ≤ −3% day), the disposition effect
  (losers held ≥1.25× longer than winners) and overtrading (6+ trades in 24h). The Trade form shows a
  gentle, non-blocking nudge before you place a trade; Insights counts each bias over the last 30 days.
  The symbol's day change is recorded on each trade for this. `src/lib/biases.ts`.
- **Mood tags** — Optionally tag a trade Confident / Anxious / Bored / Excited / Calm. Insights shows realized
  P/L and win rate per mood (attributed to the mood at entry or at exit). `src/lib/moods.ts`.
- **"If you never sold" ghost line** — On the You vs. S&P 500 chart (Portfolio), with a toggleable legend for
  each line. *Approximation:* Sentia stores only total value + SPY per snapshot, so each sold lot's later
  value is estimated by linear interpolation between your own fill prices for that symbol and the current
  quote (flat outside that range), then added back to your real value. Deposits/withdrawals are excluded the
  same way as the main line. `seriesWithGhost` in `src/lib/benchmark.ts`.
- **Time Machine** (`/app/time-machine`) — A separate practice account (stored in `state.replay`; the main
  account is never touched). Scenarios: COVID crash (Feb–Jun 2020), 2008 crisis (Sep 2008–Mar 2009) and the
  2021 meme/tech run (Jan–Dec 2021). Start with $10k, step +1 day / +1 week / to the end, trade at each day's
  close, watch your equity curve vs SPY, and get a report card (return vs SPY, max drawdown, process
  feedback such as panic selling into the drawdown or concentration). Results are kept in `replayHistory`.
  **Data:** real daily closes bundled in `src/data/time-machine.json`, fetched by
  `scripts/fetch-time-machine-data.mjs` from the Yahoo Finance chart API (split-adjusted closes, *not*
  dividend-adjusted, so total returns are slightly understated). Tickers: SPY, QQQ, AAPL, MSFT, AMZN, NVDA,
  JPM, XOM, TSLA (not in 2008 — it IPO'd in 2010, so it's dropped rather than invented) and GME (2021 only).
  Because prices are split-adjusted, e.g. 2021 GME and 2008 AAPL show today's per-share scale.
- **Legend portfolios** (`/app/legends`) — Compare your holdings with Berkshire Hathaway's top 15 positions
  from its **13F-HR for the quarter ended 2026-06-30** (filed 2026-08-14, SEC accession
  0001193125-26-352200; weights = share of reported 13F value) and two clearly labelled *model* portfolios
  (Classic 60/40, Three-fund). Shows weight-based overlap % (Σ of the smaller weight per shared issuer;
  GOOG/GOOGL merged), shared names, sector mix side by side and concentration (top weight, effective number of
  holdings). Data and sources live in `src/data/legends.ts`.
- **Shareable trade cards** — From any closed trade (a ledger sell) in Trade → Recent activity, generate a
  glassy 1080×1080 PNG (canvas) with the symbol, thesis title, result %, hold length and the Sentia logo.
  Dollar amounts are hidden by default (toggle to show). Download, or share via the Web Share API where
  supported. `src/lib/share-card.ts`.
- **Celebrations** — Lightweight canvas confetti (no dependency; skipped when the OS asks for reduced motion)
  plus `navigator.vibrate` where supported, on a profitable close linked to a thesis, crossing a Discipline
  Score milestone (60/75/90; the first load only records a baseline) and beating SPY in the Time Machine.
  Both can be turned off in Settings.
- **Ask Sentia** (`/app/coach`) — A rule-based chat coach with suggested-question chips that answers from your
  data: sector concentration ("am I too heavy in tech?" via a symbol → sector map in `src/lib/sectors.ts`),
  cash level, biggest winner/loser, thesis coverage, biases, mood patterns, Discipline Score and a weekly
  review list. It is built behind a `CoachProvider` interface (`src/lib/coach.ts`) so an LLM provider can be
  plugged in later; only the offline rule-based provider ships, with no API keys.
- **Thesis stress test** — On each thesis, *Stress test* asks "What would prove this wrong?" plus an optional
  exit trigger (price above/below and/or a free-text condition). Saving can create a price alert through the
  existing alert system; the stress test and its alert status show on the thesis. `src/lib/stress-test.ts`.
- **Friend leagues** (`/app/leagues`) — Only when Firebase is configured *and* you're signed in: create a
  league (6-character code, no ambiguous 0/O/1/I) or join one by code. Each member publishes only a small
  summary (display name, Discipline Score, 30-day return %) to `leagues/{code}/members/{uid}`; the
  leaderboard ranks by Discipline Score, then return (ties share a rank). `firestore.rules` lets any verified
  user fetch a league by code (no listing), only members read the leaderboard, and each user write/delete
  only their own member doc with validated fields. Guest/demo mode (e.g. GitHub Pages) shows an explanatory
  locked state. `src/lib/leagues.ts` (pure, tested) + `src/lib/league-store.ts` (Firestore).

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
| `npm run data:time-machine` | Re-fetch the bundled Time Machine price data (`src/data/time-machine.json`) |

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
  insights, profile helpers, and a `useSyncExternalStore`-based store (`store.tsx`). The v4 coaching
  features are pure, unit-tested modules: `biases.ts`, `moods.ts`, `discipline.ts`, `time-machine.ts`,
  `legends.ts`, `leagues.ts`, `coach.ts`, `stress-test.ts`, `share-card.ts`, `sectors.ts`.
- **`src/data`** — bundled static data: Time Machine prices and legend portfolios (with sources and as-of dates).
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
