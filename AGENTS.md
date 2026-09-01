# AGENTS.md

## Cursor Cloud specific instructions

### Repository layout (important)
The `main` branch is intentionally empty — it contains only `README.md`. The actual
applications live on separate feature branches, each a **standalone Next.js 16 / React 19
app** (App Router, TypeScript, Tailwind v4, package manager: **npm**). Only one branch is
checked out at a time; these are not packages in a monorepo.

| Branch | Product | Notes |
| --- | --- | --- |
| `cursor/ainvestpro-rebuild-5d97` | AInvestPro | Landing page + multi-screen workspace at `/app` (Portfolio, Markets, Insights, Allocation, Learn, Goals, Thesis, Check-in, Quiz, Settings) |
| `cursor/ainvestpro-rebuild-aa93` | AInvestPro (variant) | Flatter routes (`/portfolio`, `/goals`, `/mood`, …); adds `npm run typecheck`; CSP/security headers in `next.config.ts` |
| `cursor/financial-wellness-app-3b5e` | Harbor | Bank/cash-flow wellness app; Plaid-compatible with a built-in **sandbox demo mode** (no credentials needed) |

Because `main` has no `package.json`, the startup update script guards on its presence, so
it is a no-op on `main` and runs `npm install` on any app branch.

### Running an app
All three apps use the same commands (run from the checked-out branch root):

- `npm install` — install deps (already run by the startup update script when `package.json` exists)
- `npm run dev` — dev server on **http://localhost:3000** (Turbopack)
- `npm run build` / `npm run start` — production build / serve
- `npm run lint` — ESLint
- `npm test` — unit tests (Node test runner via `tsx --test`)
- `npm run typecheck` — TypeScript check (aa93 branch only)

### Data & external services
- **No database, cache, or message broker** is required for any app.
- AInvestPro stores portfolio state in the browser `localStorage`; Harbor uses HTTP cookies.
- External APIs are **optional**: `FINNHUB_API_KEY` (AInvestPro live quotes) and
  `PLAID_CLIENT_ID` / `PLAID_SECRET` / `PLAID_ENV` (Harbor live banking). Without them the
  apps run with demo/sandbox data. Copy `.env.example` → `.env.local` to configure.

### Gotchas
- Node 22 is used and works fine even though `@types/node` is pinned to `^20`.
- Next.js 16 prints a deprecation warning about the `middleware` file convention (should be
  `proxy`) and telemetry notices — these are harmless, not errors.
- This Next.js major has breaking changes vs. older versions; the per-branch `AGENTS.md`
  points to `node_modules/next/dist/docs/` — read those before writing Next.js code.
