# AInvestPro

Professional rebuild of the [AInvestPro](https://www.vibecodeapp.com/s/cmkh00xkc00e607hqja6q0v3i) investing companion — portfolio tracking, goals, investment theses, behavioral check-ins, and short lessons.

## Why this rebuild

The original Vibecode prototype mixed useful investing habits with fragile client-side patterns. This version focuses on:

- **Stability** — typed domain model, deterministic portfolio math, local persistence with safe fallbacks
- **Security** — server-only market quotes, Zod validation, rate limiting, security headers / CSP, no secrets in the browser
- **Professional UX** — clearer hierarchy, light fintech aesthetic, process-first insights (not hype)

## Features

- Portfolio dashboard with goal progress, XP, streaks, and health
- Holdings with cost basis / unrealized gain
- Allocation analytics
- Rules-based insights (cash buffer, concentration, mood, learning gaps)
- Investment thesis journal
- Mood check-ins + investor type quiz
- Learning modules with progress

Demo holdings are seeded to mirror the original ~$20.9k portfolio and $25k goal.

## Stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS v4
- Zod validation
- Optional Finnhub quotes (`FINNHUB_API_KEY`, server-only)

## Setup

```bash
npm install
cp .env.example .env.local   # optional: add FINNHUB_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm test` | Domain unit tests |

## Data & privacy

Portfolio state is stored in the browser (`localStorage`). Quotes are fetched through `/api/quotes` so API keys never ship to the client. Without `FINNHUB_API_KEY`, the app uses demo prices.

## Disclaimer

AInvestPro is an education and journaling tool, not investment advice or a brokerage.

## View in Vibecode

This rebuild can be published to Vibecode so it is openable in the Vibecode app / at a `*.vibecode.run` URL.

1. Create an API key at [vibecode.dev/key](https://vibecode.dev/key)
2. Install the CLI and export the key:

```bash
mkdir -p ~/.local/bin
curl -fsSL https://github.com/vibecode/vibecode-cli/releases/download/v0.1.0/vibecode-cli-linux-amd64 \
  -o ~/.local/bin/vibecode-cli && chmod +x ~/.local/bin/vibecode-cli
export PATH="$HOME/.local/bin:$PATH"
export VIBECODE_API_KEY="your-key"
```

3. Deploy:

```bash
./scripts/deploy-vibecode.sh ainvestpro
```

The script creates a Vibecode **webapp** project, runs the platform agent + deploy (`yolo`), and tries to claim `ainvestpro.vibecode.run`.

