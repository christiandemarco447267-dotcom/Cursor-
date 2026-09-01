# Sentia

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
prices), so everything except live quotes works exactly like the dev server.

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

## Architecture

- **`src/lib`** — framework-free domain logic: Zod schemas + migration (`types.ts`,
  `storage.ts`), valuation & trading (`portfolio.ts`), market data (`market.ts`),
  insights, profile helpers, and a `useSyncExternalStore`-based store (`store.tsx`).
- **`src/app`** — App Router pages (thin) + API routes (`/api/market`, `/api/health`).
- **`src/components`** — one client view component per screen plus shared UI primitives.
- **`src/proxy.ts`** — security headers (Next.js 16 `proxy` convention).

## Disclaimer

Educational paper-trading software. No real money, no brokerage integration. Prices are
simulated unless a Finnhub key is configured.
