# AInvestPro

Professional rebuild of the Vibecode **AInvestPro** paper-portfolio coach: portfolio tracking, goals, investment theses, lessons, mood check-ins, and investor-type discovery — with stronger stability and security defaults.

Original prototype: [vibecodeapp.com share link](https://www.vibecodeapp.com/s/cmkh00xkc00e607hqja6q0v3i)

## What’s improved

- **Professional product shell** — branded landing page + multi-screen workspace (Home, Portfolio, Markets, Insights, Allocation, Learn, Goals, Thesis, Check-in, Quiz, Settings).
- **Stable state** — typed domain model, Zod validation on every persist/import, schema versioning, safe reset/export.
- **Secure defaults** — security headers middleware, rate-limited market API, optional Finnhub key stays server-side, educational disclaimers, no broker credentials.
- **Offline-friendly demo quotes** when no API key is configured.

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

| Command        | Purpose              |
| -------------- | -------------------- |
| `npm run dev`  | Local development    |
| `npm run build`| Production build     |
| `npm run start`| Serve production     |
| `npm run lint` | ESLint               |
| `npm test`     | Unit tests           |

## Security notes

- Portfolio data is stored in the browser (`localStorage`) and validated before write.
- `/api/market` is rate-limited and never exposes secrets to the client.
- This is **educational paper-portfolio software**, not investment advice and not a brokerage.
