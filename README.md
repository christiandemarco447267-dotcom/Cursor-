# Harbor

Financial wellness advice shaped by your real banking data.

Harbor connects to bank accounts through a Plaid-compatible API layer, builds a picture of cash flow / debt / savings runway, and returns prioritized next steps—not generic tips.

## Features

- **Banking data integration** — Sandbox demo by default; switch to live [Plaid](https://plaid.com) with env credentials
- **Financial profile** — Income rhythm, essentials, discretionary spend, subscriptions, emergency fund months, savings rate
- **Wellness score** — Weighted from emergency cover, savings rate, high-APR debt, cash flow, and subscription load
- **Tailored advice** — Ranked actions (debt avalanche, emergency fund, savings rate, subscription audit, dining trim, surplus allocation)

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), click **Connect your bank**, pick a demo institution, then explore the dashboard.

## Live banking data (Plaid)

Copy `.env.example` to `.env.local` and set:

```bash
PLAID_CLIENT_ID=...
PLAID_SECRET=...
PLAID_ENV=sandbox
```

When those are present, API routes use the live Plaid provider (`/link/token/create`, `/item/public_token/exchange`, `/accounts/get`, `/transactions/get`).

> Production apps should persist `access_token` per user after exchange. For demos you can set `PLAID_ACCESS_TOKEN`.

## Architecture

```
src/lib/banking/     Provider interface, sandbox data, Plaid client
src/lib/finance/     Cash-flow analytics + advice engine
src/app/api/         Link token, connect, snapshot, advice routes
src/app/dashboard/   Circumstance summary + tailored recommendations
```

## Scripts

| Command       | Description        |
|---------------|--------------------|
| `npm run dev` | Local development  |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint             |

## Disclaimer

Harbor is an educational demo. It is not a registered investment advisor, bank, or credit counselor. Advice is generated from heuristics over linked transaction data.
