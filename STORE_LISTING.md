# Sentia — store listing copy & screenshot checklist

Draft copy for App Store Connect and Google Play Console. Character limits are checked (counts in brackets).
Avoid words reviewers read as real-money or gambling: *win*, *cash out*, *bet*, *earn*, *profit guaranteed*.

---

## Names

| Field | Store | Limit | Text |
|---|---|---|---|
| App name | Apple | 30 | **Sentia: Paper Trading Coach** [27] |
| App name | Google | 30 | **Sentia: Paper Trading Coach** [27] |
| Subtitle | Apple | 30 | **Practice investing, no risk** [27] |
| Short description | Google | 80 | **Practice investing with simulated trades, theses and a coach. No real money.** [76] |

Alternative subtitles: "Invest with process, risk-free" [30] · "Stock market practice & coach" [29].

## Promotional text (Apple, 170, editable any time without review)

> Practice the habits that matter: write a thesis before you buy, track your Discipline Score, and ask the coach why. Simulated paper trading — no real money involved. [165]

## Keywords (Apple, 100, comma-separated, no spaces needed)

```
paper trading,stock simulator,investing,practice,portfolio,learn stocks,market,coach,thesis,finance
```
[99]

## Full description (Google 4,000 / Apple 4,000)

```
Sentia is a calm, focused place to practice investing — with simulated money and real habits.

Simulated paper trading. No real money. Not investment advice.

BUILD THE PROCESS, NOT JUST THE PORTFOLIO
• Buy and sell with a simulated cash balance. Sentia tracks your average cost and realized gains like a real account.
• Market, limit and stop orders, price alerts and a watchlist.
• Write an investment thesis for each position — why you bought it, the risks, and your conviction — so future-you remembers the plan.

SEE HOW DISCIPLINED YOU REALLY ARE
• Discipline Score rewards process: thesis coverage, position sizing, diversification, avoiding emotional trades and using risk tools.
• Bias Radar flags patterns like FOMO buys, revenge trades, panic selling and overtrading.
• Compare your returns with the S&P 500.

LEARN FROM HISTORY
• Time Machine: replay real historical market stretches and see whether your decisions would have beaten the index.
• Legends: explore how well-known long-term investors think.
• Ask the coach: educational answers about your simulated portfolio (AI coach where available, with a built-in offline coach).

PRIVATE BY DESIGN
• No account needed. Your portfolio is stored on your device.
• Works offline. Live prices and the AI coach need a connection; otherwise prices are clearly labelled Demo.
• No ads. No tracking. Optional, anonymous usage counts only if you say yes.
• Delete everything anytime in Settings → Delete my data.

IMPORTANT
Sentia is an educational simulator. It is not a brokerage, does not hold or move money, and does not give personalized investment advice. Prices may be delayed or simulated. Past performance doesn't predict future results.
```

## What's new (version 1.2.0)

```
Welcome to Sentia on your phone!
• The full paper-trading coach, now as an app that works offline.
• Designed for your phone: safe areas, keyboard-friendly forms, haptics and the Android back button.
• New in Settings: About (with our simulation disclaimer) and Delete my data.
```

## Category — recommendation

| Store | Primary | Secondary | Why |
|---|---|---|---|
| Apple | **Education** | Finance | Sentia teaches a process and handles no money. Education avoids the impression of a regulated financial service (Guideline 5.1.1(ix) applies to apps that *provide* financial services) and is less crowded than Finance. Finance as secondary still surfaces it to people browsing investing apps. |
| Google | **Education** | — (Google has one category; use tags such as "Investing" and "Learning") | Same reasoning. The Financial features declaration is still required and should say "no financial features". |

If you prefer Finance as primary on Apple, keep the disclaimer in the first lines of the description and in the review notes.

## Contact details for the listings

- Support email: set `NEXT_PUBLIC_FEEDBACK_EMAIL` (a real inbox you check). Google shows the developer email publicly.
- Support URL / Privacy / Deletion URLs: see STORE_RELEASE.md §7.

---

## Screenshot checklist

Draft screenshots are in `store-assets/screenshots/` (generated from the app with seeded demo data, demo prices, simulated notch/home-indicator insets). Replace or polish before submitting — e.g. add a one-line caption above each phone frame.

### Apple App Store
Format: PNG or JPEG, **no transparency**, 1–10 per size. Source: [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications).

| Device class | Required? | Accepted portrait sizes (px) | Draft provided |
|---|---|---|---|
| iPhone 6.9" | Provide this **or** 6.5" (6.9" recommended; App Store Connect scales down to smaller iPhones) | **1320 × 2868**, 1290 × 2796, 1260 × 2736 | ✅ `screenshots/iphone-6.9/01…06` (1320 × 2868) |
| iPhone 6.5" | Only if no 6.9" set | 1284 × 2778, 1242 × 2688 | — (not needed) |
| iPad 13" | Only if the app runs on iPad | 2064 × 2752, 2048 × 2732 | — (app is set to iPhone-only) |
| App icon | Required (from the build) | 1024 × 1024, no alpha | ✅ `app-store-icon-1024.png` |

### Google Play
Format: JPEG or 24-bit PNG (no alpha). Source: [Add preview assets](https://support.google.com/googleplay/android-developer/answer/9866151).

| Asset | Required? | Size rules | Draft provided |
|---|---|---|---|
| Phone screenshots | **2–8 required** | 16:9 or 9:16, each side 320–3,840 px; 1080 × 1920 recommended | ✅ `screenshots/android-phone/01…06` (1080 × 1920) |
| 7-inch tablet | Optional (needed for tablet featuring) | 16:9 or 9:16, each side 1,080–7,680 px (e.g. 1200 × 1920) | — |
| 10-inch tablet | Optional | 16:9 or 9:16, each side 1,080–7,680 px (e.g. 1600 × 2560) | — |
| Feature graphic | **Required** | exactly **1024 × 500** | ✅ `feature-graphic-1024x500.png` |
| App icon | **Required** | 512 × 512, 32-bit PNG, ≤1 MB | ✅ `play-icon-512.png` |

### Suggested order & captions
1. Dashboard — "Your practice portfolio, at a glance"
2. Portfolio — "Track holdings, cost basis and gains"
3. Trade — "Simulated buy & sell. No real money."
4. Insights — "A Discipline Score that rewards process"
5. Thesis — "Write down why before you buy"
6. Time Machine — "Replay market history. Beat the index?"

To regenerate after UI changes: build the mobile export (`npm run build:mobile`), serve `out/` locally, and capture at 440 × 956 CSS px @3× (iPhone 6.9") and 360 × 640 @3× (Android) with a seeded `sentia.state.v2` in localStorage.
