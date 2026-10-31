# Sentia pilot setup — checklist for Christian

This turns on the three pilot features: **real market prices**, **in-app feedback + anonymous usage
counts**, and the **AI coach**. It takes about 30 minutes, and the site keeps working the whole time.
Until you finish, the site simply shows clearly labelled demo prices, the built-in coach, and
email/GitHub feedback links.

> **What's a "secret" vs a "variable"?** Secrets are passwords/keys. They go **only into Cloudflare**
> and never into GitHub or the website. The one thing GitHub needs is your API's public web
> address, which is a plain **variable**.

---

## ☐ 1. Get your free keys (10 min)

| Key | Where | Cost |
| --- | --- | --- |
| Finnhub (stock prices) | <https://finnhub.io/register>. Copy your API key from the dashboard. | Free (60 calls/min) |
| OpenAI **or** Anthropic (AI coach) | OpenAI: <https://platform.openai.com/api-keys>. Anthropic: <https://console.anthropic.com> → API keys. Add about $5 of credit; you won't come close to using it during a pilot. | Pay as you go (pennies, see costs below) |
| Admin token (your private password for reading feedback) | Make one up: 16+ random characters. Easy way: run `node -e "console.log(crypto.randomUUID()+crypto.randomUUID())"` | Free |
| *(optional)* Discord or Slack webhook | Discord: Server settings → Integrations → Webhooks → New → Copy URL. Slack: create an "Incoming Webhook" app. | Free |

Keep these somewhere safe, like your password manager.

## ☐ 2. Create a free Cloudflare account (3 min)

<https://dash.cloudflare.com/sign-up>. Verify your email. No card needed.

## ☐ 3. Deploy the API (10 min)

Follow **`worker/README.md` → "Deploy it"**, steps 2–6. In short, from the `worker` folder:

```bash
npm install
npx wrangler login
npx wrangler kv namespace create SENTIA_KV      # paste the printed id into worker/wrangler.toml
npx wrangler secret put FINNHUB_API_KEY
npx wrangler secret put OPENAI_API_KEY          # or ANTHROPIC_API_KEY (then set COACH_PROVIDER = "anthropic" in wrangler.toml)
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put FEEDBACK_WEBHOOK_URL    # optional
npx wrangler deploy
```

Copy the address it prints, e.g. `https://sentia-api.yourname.workers.dev`.
Check `https://sentia-api.yourname.workers.dev/health`. It should say `"ok": true`, with
`finnhub`, `coach`, `feedback` and `analytics` all `true`.

### Exactly which secrets to set (in Cloudflare, via `npx wrangler secret put`)

| Name | Required? | Value |
| --- | --- | --- |
| `FINNHUB_API_KEY` | Recommended (without it, prices come only from Yahoo and are labelled Delayed) | Your Finnhub key |
| `OPENAI_API_KEY` **or** `ANTHROPIC_API_KEY` | For the AI coach | Your provider key |
| `ADMIN_TOKEN` | For reading feedback & stats | Your made-up long password |
| `FEEDBACK_WEBHOOK_URL` | Optional | Discord/Slack webhook URL |

## ☐ 4. Point the website at your API (3 min)

On GitHub, open the **Cursor-** repo → **Settings** → **Secrets and variables** → **Actions** →
**Variables** tab → **New repository variable**:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SENTIA_API_URL` | `https://sentia-api.yourname.workers.dev` (no slash at the end) |
| `NEXT_PUBLIC_FEEDBACK_EMAIL` *(optional)* | A public email for the fallback "Email it" button. Leave it out to keep your email off the site. |

⚠️ Use the **Variables** tab, not Secrets. The workflow reads `vars.NEXT_PUBLIC_SENTIA_API_URL`.

**Clean-up:** if an old repository *secret* named `FINNHUB_API_KEY` exists from before, delete it
(Settings → Secrets → Actions). The site no longer uses it, and older builds put that key in the
public website code. If that key was ever deployed, also click **regenerate** on Finnhub's
dashboard and use the new key in step 3.

## ☐ 5. Redeploy the site (2 min)

Merge the `pilot-core` branch into `main` (or push to `main`). The **Deploy to GitHub Pages** workflow
runs automatically. You can also run it by hand: **Actions** → **Deploy to GitHub Pages** → **Run workflow**.

## ☐ 6. Check it on your phone (2 min)

Open <https://christiandemarco447267-dotcom.github.io/Cursor-/app/>:
- **Markets**: prices show a green **Live** badge (or amber **Delayed**). Tap or hover one for the "as of … ET" time.
- **Trade**: a market order fills at the live price. A price you type is only a limit.
- **Ask Sentia**: type a question. The answer is labelled **AI coach**. The quick chips are labelled **Built-in coach**.
- **Feedback** (sidebar, or the ☰ menu on phones): send yourself a test message.
- A small **"Help improve Sentia?"** card asks about anonymous usage counts. Tap Allow to test.

---

## Reading feedback and analytics

- **Discord/Slack**: if you set the webhook, each message arrives there instantly.
- **Feedback list** (newest first):
  ```bash
  curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" https://sentia-api.yourname.workers.dev/feedback/list
  ```
- **Usage totals** (page views and the named actions, per day, UTC):
  ```bash
  curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" "https://sentia-api.yourname.workers.dev/stats?days=7"
  ```
- Or browse it in the Cloudflare dashboard: **Storage & Databases → KV → SENTIA_KV**.
- The 7-day survey answers arrive as feedback with `"type": "survey"` and a `rating` of 1–5.

What's counted (only from people who tapped Allow): page views per page, `trade_placed`,
`thesis_created`, `time_machine_finished`, `coach_asked`, `feedback_sent`. No cookies, IDs, IPs or
portfolio data. The in-app Privacy page says exactly this.

---

## What it costs per month (rough, for a pilot of about 20–50 people)

Prices were checked on Oct 30, 2026 on the providers' own pages. Usage numbers are **estimates**.

| Service | Free allowance | Pilot estimate |
| --- | --- | --- |
| GitHub Pages | Free | **$0** |
| Cloudflare Workers (free plan) | 100,000 requests/day; KV: 100,000 reads + 1,000 writes per day ([pricing](https://developers.cloudflare.com/workers/platform/pricing/)) | **$0**. Each open app tab checks prices every 15 s (~240 requests/hour), so 100k/day ≈ 400 hours of app use a day. KV writes (feedback, usage batches, AI counters) are the first limit you'd hit, at roughly 50+ daily active users. Workers Paid is **$5/month** for 10M requests and 1M KV writes. |
| Finnhub | Free: 60 calls/min, personal-use licence ([pricing](https://finnhub.io/pricing)) | **$0**. The API stays under 50 calls/min and switches to Yahoo (labelled Delayed) when busy. |
| AI coach: OpenAI `gpt-6-luna` | $0.10 per 1M input tokens, $0.50 per 1M output ([pricing](https://developers.openai.com/api/docs/pricing)) | About **$0.0005 per question** (≈2,000 tokens in, ≤500 out). 1,000 questions ≈ **$0.50**. The worst case at the 500/day cap is ≈ **$7–8/month**. |
| AI coach: Anthropic `claude-haiku-5-5` | $0.10 / $0.50 per 1M tokens (prompts ≤100k) ([pricing](https://docs.anthropic.com/en/docs/about-claude/pricing)) | Same as above. |

**Expected total for the pilot: $0–1/month**, or about $6 if you move to Workers Paid. To cap AI
spend, lower `COACH_DAILY_LIMIT_TOTAL` in `worker/wrangler.toml` and redeploy. You can also set a
monthly budget limit in your OpenAI or Anthropic billing settings.

---

## If something looks wrong

| You see | Means | Fix |
| --- | --- | --- |
| "Demo prices" badge everywhere | The site doesn't have the API address | Check step 4 (it must be a *Variable*), then redeploy (step 5) |
| "Demo prices · live offline" | The site has the address but can't reach the API | Open `/health` on your API. Check `ALLOWED_ORIGINS` in `wrangler.toml` matches `https://christiandemarco447267-dotcom.github.io` |
| Prices say "Delayed" | Finnhub key missing or busy, so Yahoo is being used | Check the `FINNHUB_API_KEY` secret |
| Coach answers say "Built-in coach" with a note | AI key missing, daily cap reached, or provider error | Check `/health` → `"coach": true`, your AI credit, and the daily limits |
| Feedback says "storage is not configured" | KV id not set | Step 3: paste the KV id into `wrangler.toml`, redeploy the worker |

## Known limitations (honest list)
- US market holidays aren't detected when no Finnhub key is set (the New York clock is used).
- Yahoo's chart API is unofficial and could stop working. Finnhub is the primary source.
- Finnhub's free plan is licensed for personal use. For a wider or commercial launch, check their
  terms or switch to a paid data plan.
- The AI coach can still make mistakes. It is told to quote only your numbers and to say when data
  is missing, and every answer is labelled.
- Usage counts are approximate (good for trends, not exact audits).
