# Draft answers: Apple privacy label, Google Data safety, age ratings

Based on what this build of Sentia actually sends off the device (checked against the code on the `store-ready` branch, Oct 30, 2026). **Accounts (Firebase) are OFF in the app build.** If you turn accounts on, use the "If accounts are enabled" notes.

## What leaves the device, and when

| Feature | When | What is sent | Where | Kept |
|---|---|---|---|---|
| Live prices | Only if the build has `NEXT_PUBLIC_SENTIA_API_URL` | Ticker symbols on screen | Sentia API (Cloudflare Worker) → Finnhub / Yahoo | Not stored (short cache of public quotes) |
| AI coach | User types a question (and the API has a provider key) | The question + a summary of the **simulated** portfolio (cash, holdings, recent trades with mood tags, Bias Radar, Discipline Score, thesis titles/conviction/risks, return vs S&P 500). No name/email | Sentia API → OpenAI or Anthropic (service provider) | Not stored by Sentia; daily counter keyed by a one-way, daily-rotating IP hash |
| Feedback / survey | User presses Send | Type, message, email **only if typed**, optional technical details (page, version, screen size, user-agent, price source; on by default, can untick), optional portfolio summary (off by default); survey: 1–5 rating + optional text | Sentia API (Workers KV), optionally forwarded to the owner's Discord/Slack | Up to 1 year |
| Usage counts | Only after opt-in | Page name / one of 5 event names | Sentia API → daily totals | ~13 months, aggregate only, no IDs |
| Everything else | — | Nothing. Portfolio, theses, profile stay on the device | — | Until the user deletes it |

No ads, no third-party analytics/tracking SDKs, no advertising ID, no location, contacts, photos, camera or microphone.

---

## Apple — App Privacy ("nutrition label")

**Do you or your third-party partners collect data from this app?** → **Yes** (conservative; see note).

| Data type (Apple's names) | Collected? | Linked to the user? | Used for tracking? | Purposes |
|---|---|---|---|---|
| Contact Info → **Email Address** | Yes (only if typed into feedback) | **No** | No | App Functionality (replying to feedback) |
| User Content → **Other User Content** | Yes (coach questions + simulated-portfolio summary; feedback text) | **No** | No | App Functionality |
| Usage Data → **Product Interaction** | Yes (opt-in page/event counts) | **No** | No | Analytics |
| Diagnostics → **Other Diagnostic Data** | Yes (optional technical details with feedback) | **No** | No | App Functionality |
| Everything else (Location, Identifiers, Purchases, Financial Info, Health, Contacts, Browsing/Search History, Sensitive Info, Audio/Photos) | **No** | — | — | — |

Result shown on the store: **"Data Not Linked to You"** (Contact Info, User Content, Usage Data, Diagnostics) and **no "Data Used to Track You"**.

Notes:
- *Financial Info* means real payment/credit/financial data. The simulated portfolio isn't real financial information, which is why it's listed as User Content. If you prefer the most cautious reading, you may add Financial Info → Other Financial Info (Not linked, App Functionality); it doesn't change the "not linked" headline.
- Apple lets you omit data that is optional, infrequent, user-initiated feedback. Declaring it anyway (as above) is the safer choice and matches the bundled `ios/App/App/PrivacyInfo.xcprivacy`.
- **If accounts are enabled:** add Contact Info → Email Address (Linked, App Functionality), Contact Info → Phone Number if SMS two-step is on (Linked, App Functionality), User ID (Linked, App Functionality), and User Content (Linked) for the cloud-synced portfolio.

Privacy policy URL: `…/privacy/` (see STORE_RELEASE.md §7).

---

## Google Play — Data safety form

1. **Does your app collect or share any of the required user data types?** → **Yes**
2. **Is all of the user data collected by your app encrypted in transit?** → **Yes** (HTTPS only)
3. **Which account creation methods?** → *My app does not allow users to create an account* (accounts off). **If accounts are enabled:** "Username and password" (+ other), and give the deletion URL `…/delete-account/`.
4. **Data deletion:** users can delete everything in-app (Settings → Delete my data). Provide the URL `…/delete-account/` where asked (it also explains how to request deletion of feedback).

| Category → Data type | Collected | Shared* | Processed ephemerally | Required or optional | Purposes |
|---|---|---|---|---|---|
| Personal info → **Email address** | Yes | No | No | **Optional** (only if typed in feedback) | Developer communications, App functionality |
| Messages → **Other in-app messages** (feedback text, survey answer) | Yes | No | No | Optional | App functionality, Developer communications |
| App activity → **Other user-generated content** (AI coach question + simulated portfolio summary) | Yes | No | **Yes** | Optional | App functionality |
| App activity → **App interactions** (opt-in page/event counts) | Yes | No | No | Optional | Analytics |
| App info and performance → **Diagnostics** (optional technical details with feedback) | Yes | No | No | Optional | App functionality |

\* *Shared* = transferred to a third party. Sending data to a **service provider** that processes it on your behalf (Cloudflare, OpenAI/Anthropic for the coach, Finnhub for quotes) is **not** "sharing" under Google's definition, so answer **No** — but only if those providers process the data solely for you under their API terms (true for the standard OpenAI/Anthropic API terms; re-check if you change providers).

Not collected: location, financial info (real), health, photos/videos, audio, files, calendar, contacts, web browsing, device or other IDs.

Also in **App content**: Ads → *No*. Target audience → **13–15, 16–17, 18+**. **Financial features** → *My app doesn't provide any financial features*. Health apps → *No*.

---

## Age ratings — recommendation

The brief suggested 17+ / Teen. Against the current definitions, Sentia doesn't qualify for those: paper trading of stocks is not "simulated gambling" (Apple defines that as betting or wagering — casino, card, sports betting; Sentia has no wagers, odds, payouts or chance mechanics), and it has no unrestricted web browser, user-to-user chat, user-generated content shared with others, ads or mature content.

### Apple (questionnaire, 2025+ system: 4+, 9+, 13+, 16+, 18+)
| Question | Answer |
|---|---|
| Parental controls / Age assurance | No / No |
| Unrestricted web access | **No** (links open in the system browser; the app has no browser of its own) |
| User-generated content | No (feedback is private; leagues are off with accounts off) |
| Social media | No |
| Messaging and chat | No (the AI coach is not user-to-user chat) |
| Advertising | No |
| Mature themes, medical/wellness, sexuality, violence | None |
| Gambling | No · Simulated gambling **None** · Loot boxes No |
| Contests | **None** with accounts off. If accounts + friend leagues are enabled: *Infrequent* (still 4+) |

**Result: 4+.** You may *raise* it in App Store Connect (e.g. to **13+**) to match the privacy policy's "not directed at children under 13" — optional, not required. Source: [Apple age rating values and definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions) · [Updated age ratings (deadline Jan 31, 2026)](https://developer.apple.com/news/upcoming-requirements/?id=07242025a).

### Google Play (IARC questionnaire)
Category: **Reference, News, or Educational** (not a game). Answer **No** to violence, sexuality, language, controlled substances, crude humour, **gambling (real or simulated)**, user interaction/chat, sharing location, digital purchases. Expected result: **Everyone / PEGI 3 / USK 0** (IARC assigns the exact labels). Keep the target audience at 13+ as above.

> If an IARC or App Review question about "simulated gambling" comes up, answer **No**: there is no wagering, prize, odds or chance-based outcome — users make simulated investment decisions on market prices.
