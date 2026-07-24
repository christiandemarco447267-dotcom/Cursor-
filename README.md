# AInvestPro

A stable, professional rebuild of the **AInvestPro** paper-trading coach. It's an
educational, local-first app for practicing a disciplined investing *process* — not a
brokerage and not investment advice.

## What's new in this rebuild

This version fixes the structural weaknesses of the earlier prototype and adds a real
simulation instead of a static holdings list:

- **Real paper trading** — Buy and sell against a cash balance. Buys merge into a single
  lot with a **weighted-average cost basis**; sells realize P/L and credit cash. Every
  action is written to a transaction ledger (`/app/trade`).
- **Full CRUD** — Goals can be funded, adjusted, and deleted; theses can be edited and
  deleted; holdings can be **linked to a thesis** (the link is now used consistently by
  the health grade and Insights).
- **Coherent gamification** — One clear engagement streak (local-date based, advanced at
  most once/day) with a longest-streak record, plus a health grade derived from the same
  `processSignals` the Insights screen reads, so advice never contradicts the grade.
- **Stable state** — Versioned schema (`v2`) with an **automatic migration** path from
  `v1`, cross-tab synchronization via the `storage` event, and a single metadata-commit
  pass per mutation.
- **Hardened market layer** — `/api/market` reports true `open`/`closed` status (US
  Eastern hours), degrades gracefully per-symbol on live-quote failures, and is
  rate-limited. The proxy sets a strict CSP (no `unsafe-eval` in production) and security
  headers.
- **Full navigation parity** — Every screen is reachable from the sidebar and a scrollable
  mobile bottom bar.
- **Broader tests** — Unit tests cover trading math, migrations, gamification, quiz
  scoring, insights, and allocation.

## Quick start

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
  `storage.ts`), valuation & trading (`portfolio.ts`), gamification/health
  (`gamification.ts`), market data (`market.ts`), insights, lessons, quiz, and a
  `useSyncExternalStore`-based store (`store.tsx`).
- **`src/app`** — App Router pages (thin) + API routes (`/api/market`, `/api/health`).
- **`src/components`** — one client view component per screen plus shared UI primitives.
- **`src/proxy.ts`** — security headers (Next.js 16 `proxy` convention).

## Disclaimer

Educational paper-trading software. No real money, no brokerage integration. Prices are
simulated unless a Finnhub key is configured.
