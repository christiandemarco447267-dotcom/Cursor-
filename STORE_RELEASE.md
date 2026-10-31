# Sentia — App Store & Google Play release checklist

A plain-English, step-by-step guide to getting the Sentia app into **Google Play** and the **Apple App Store**.
Nothing in this repository has been submitted, uploaded or published. Every step below is yours to do, in order.

> **Facts in this guide were checked on October 30, 2026** (sources at the bottom of each section).
> Store rules change; re-check anything marked *verify* on the day you submit.

---

## 0. What's already done for you (in the `store-ready` branch)

| Area | What exists | Where |
|---|---|---|
| Native apps | Capacitor 8.6 wrapper. Android project and iOS project (Swift Package Manager, no CocoaPods needed). App ID `com.sentia.papertrading`, name **Sentia**. | `capacitor.config.ts`, `android/`, `ios/` |
| App bundle | `npm run build:mobile` builds a static copy of the site **with no base path** (separate from the GitHub Pages build under `/Cursor-`) into `out/`, then runs `npx cap sync`. | `scripts/build-static.mjs` |
| Native behaviour | Dark status bar, keyboard keeps inputs visible, Android back button (closes sheets → goes back → leaves the app from the home screen), external links (GitHub, mailto, sources) open in the system browser / mail app, native haptics, splash screen, starts on the app instead of the marketing page. | `src/components/native-bridge.tsx`, `src/lib/platform.ts` |
| Live data from the app | The Sentia API (Cloudflare Worker) now accepts the app origins `capacitor://localhost` (iOS) and `https://localhost`, `http://localhost` (Android). Covered by tests. | `worker/src/http.ts`, `worker/test/cors.test.ts` |
| Icons & splash | Generated from `public/icon.png`: Android adaptive + legacy mipmaps, Android splash, iOS 1024 AppIcon (no alpha) and splash, PWA icons 48–512 + maskable, Apple touch icon, iOS web launch images. Re-run with `npm run assets:generate`. | `scripts/generate-app-assets.sh`, `resources/` |
| PWA | Full manifest (correct for `/Cursor-` and the root), offline page, service worker that caches only the app shell (never quotes, coach or feedback). | `src/app/manifest.ts`, `public/sw.js`, `public/offline.html` |
| Mobile polish | Safe areas (notch, home indicator, gesture bar), 16px inputs (no zoom-on-focus, pinch zoom still allowed), 44px tap targets, no overscroll bounce, reduced-motion respected. | `src/app/globals.css` |
| Compliance in the app | "Simulated paper trading. No real money. Not investment advice." at onboarding and in Settings → About. **Settings → Delete my data** (wipes the device; deletes the account + cloud data too if signed in). Public pages `/privacy`, `/terms`, `/support`, `/delete-account`. | `src/components/delete-data.tsx`, `src/app/*` |
| Store paperwork drafts | Listing copy, screenshot checklist, privacy-label and Data-safety answers, age-rating answers. | `STORE_LISTING.md`, `store-assets/` |

**Accounts (Firebase sign-in) are switched OFF in the app build on purpose** — see section 9. With accounts off, everything stays on the phone.

---

## 1. Decide two things first (5 minutes)

1. **App ID / bundle ID.** It is currently `com.sentia.papertrading`. Once you upload the first build to either store **it can never be changed** for that listing. If you own a domain, the convention is reverse-domain (e.g. `com.yourdomain.sentia`). To change it: edit `appId` in `capacitor.config.ts`, `applicationId` + `namespace` in `android/app/build.gradle`, the Java package folder under `android/app/src/main/java/`, and `PRODUCT_BUNDLE_IDENTIFIER` in Xcode (or just delete `android/` and `ios/` and run `npx cap add android && npx cap add ios`, then `npm run assets:generate`).
2. **Personal or organization developer account.** Personal is fastest. An organization (LLC etc.) shows the company as the seller and avoids Google's 12-tester rule, but needs a **D-U-N-S number** (free, can take days–weeks) and a public website on your domain.

---

## 2. Enroll as a developer

### Google Play Console — **US$25 one time**
- Sign up at <https://play.google.com/console/signup> with the Google account you want to own the app.
- Choose **Personal** or **Organization**. Organization requires a **D-U-N-S number** (free from Dun & Bradstreet — don't pay third parties) and a website.
- You'll verify your identity (government ID for personal accounts), email and phone. Google also checks that you have an Android device (device verification for personal accounts).
- **New personal accounts must run a closed test before going public:** at least **12 testers** opted in **continuously for 14 days**, then you *apply* for production access (Google usually answers within ~7 days and can ask for more testing). Organization accounts are exempt. Plan for this — it is the longest step on Android. Recruit 15–20 friends with Android phones so you stay above 12 if someone drops out.
- Sources: [Play Console: registration info & D-U-N-S](https://support.google.com/googleplay/android-developer/answer/13628312) · [Android Developer Console: $25 full-distribution fee, D-U-N-S for organizations](https://support.google.com/android-developer-console/answer/16604405) · [Play Console: testing requirements for new personal accounts (12 testers / 14 days)](https://support.google.com/googleplay/android-developer/answer/14151465)

### Apple Developer Program — **US$99 per year**
- Enroll at <https://developer.apple.com/programs/enroll/> (you must be 18+, Apple Account with two-factor authentication on).
- **Individual**: apps list under your personal name; no D-U-N-S needed.
- **Organization**: needs a D-U-N-S number registered to the legal entity (free; check with Apple's lookup tool), a public website on the company domain, and legal authority to sign.
- Enrollment approval usually takes about a day for individuals and longer for organizations.
- Sources: [Apple: enroll](https://developer.apple.com/programs/enroll) · [Apple: membership fee $99/yr](https://developer.apple.com/programs/whats-included/) · [Apple: D-U-N-S](https://developer.apple.com/help/account/membership/D-U-N-S)

> **Heads-up for a finance-themed app:** Apple's guideline 5.1.1(ix) says apps that *provide* regulated financial services must come from a legal entity. Sentia provides **no** financial services (no money, no brokerage, no real orders), so an individual account is fine — say so plainly in the App Review notes (template in section 7).

---

## 3. One-time setup on your computer

You need **Node 22** and the repo on the `store-ready` branch:

```bash
git checkout store-ready
npm ci
npm run build:mobile      # static export for the app + copies it into android/ and ios/
```

### Android (Windows, Mac or Linux)
- Install **Android Studio** (latest stable). It installs the Android SDK and a JDK.
- `npm run cap:android` opens the project. Let Gradle sync finish.
- Run on a phone (USB debugging) or an emulator with the green ▶ button.
- The project already targets **Android 16 (API 36)**, which Google Play requires for new apps since **August 31, 2026**. Source: [Target API level requirements](https://support.google.com/googleplay/android-developer/answer/11926878).

### iOS (needs a Mac)
- iOS apps can only be built and signed with **Xcode on macOS**. Since **April 28, 2026** uploads must be built with **Xcode 26 or later** (iOS 26 SDK). Source: [Apple: SDK minimum requirements](https://developer.apple.com/news/upcoming-requirements/?id=04282026a).
- No Mac? Options: rent a cloud Mac (MacinCloud, MacStadium, AWS EC2 Mac), or use a CI service with macOS runners (GitHub Actions `macos-latest`, Codemagic, Ionic Appflow, Xcode Cloud — Xcode Cloud includes free hours with the developer membership). You still need the Apple developer account.
- On the Mac: `npm ci && npm run build:mobile && npm run cap:ios` opens Xcode. The project uses **Swift Package Manager**, so there is **no `pod install`** step. Xcode downloads the Capacitor packages on first open.
- In Xcode → target **App** → *Signing & Capabilities*: tick **Automatically manage signing** and pick your Team.
- **Add the privacy manifest to the target:** drag `ios/App/App/PrivacyInfo.xcprivacy` into the *App* group in Xcode's file list and make sure **Target Membership → App** is ticked (it is in the folder, but Xcode only bundles files that are in the project).
- The app is set to **iPhone only, portrait** (so no iPad screenshots are needed). To support iPad later, change *Deployment Info → iPad* in Xcode and add 13-inch iPad screenshots.

---

## 4. Signing — keep these files secret and backed up

**Never commit** keystores, `.p12`, `.p8`, provisioning profiles, `keystore.properties`, `google-services.json` or `GoogleService-Info.plist`. `.gitignore` already blocks them.

### Android upload key
1. Create the key once (keep the passwords in a password manager):
   ```bash
   keytool -genkeypair -v -keystore ~/keys/sentia-upload.jks -alias sentia-upload \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Create `android/keystore.properties` (ignored by git):
   ```
   storeFile=/Users/you/keys/sentia-upload.jks
   storePassword=…
   keyAlias=sentia-upload
   keyPassword=…
   ```
   `android/app/build.gradle` picks it up automatically for release builds.
3. In Play Console, accept **Play App Signing** (Google holds the final app-signing key; yours is only the *upload* key, which Google can reset if you lose it).
4. Back up the `.jks` and passwords somewhere safe (not in the repo).

### iOS certificates & profiles
- With **Automatically manage signing**, Xcode creates the Apple Distribution certificate and App Store provisioning profile for you. Nothing to store in the repo.
- If you use CI, create an **App Store Connect API key** (`.p8`) and store it only as a CI secret.

---

## 5. Build the release files

Always start with a fresh web bundle: `npm run build:mobile`.

Before each upload bump the version:
- `package.json` → `version` (shown in Settings → About), e.g. `1.2.0`
- Android `android/app/build.gradle` → `versionName "1.2.0"` and **increase `versionCode`** by 1 every upload (1, 2, 3…)
- iOS (Xcode → General) → **Version** `1.2.0` and **increase Build** every upload

### Android App Bundle (.aab)
- Android Studio → *Build → Generate Signed App Bundle / APK → Android App Bundle → release*, or from a terminal:
  ```bash
  cd android && ./gradlew bundleRelease
  # → android/app/build/outputs/bundle/release/app-release.aab
  ```

### iOS archive (.ipa)
- Xcode → choose **Any iOS Device (arm64)** → *Product → Archive* → Organizer → **Distribute App → App Store Connect → Upload**.
- Export compliance: the app's `Info.plist` already says it uses no non-exempt encryption (`ITSAppUsesNonExemptEncryption = NO`; HTTPS only), so you won't be asked each time.

---

## 6. Test before release

### Google Play
1. Play Console → **Create app** (name *Sentia*, app, free).
2. **Internal testing** (up to 100 testers, available in minutes): upload the `.aab`, add testers' emails, share the opt-in link. Use this to sanity-check.
3. **Closed testing** (required for new personal accounts): create a track, add **≥12 testers** (email list or Google Group), share the opt-in link, and keep them opted in for **14 days in a row**. Ask testers to actually open and use the app a few times — Google checks engagement.
4. Day 15+: Dashboard → **Apply for production access** and answer the questions about your test.

### Apple
1. App Store Connect → **My Apps → + → New App** (bundle ID from Xcode, SKU e.g. `sentia-ios`).
2. After uploading, the build appears under **TestFlight** (processing takes ~5–30 min).
3. **Internal testers** (your team, up to 100) can test immediately. **External testers** (up to 10,000, via email or public link) need a short beta review first.

### What to test on real phones (both platforms)
- First launch shows the splash, then profile setup **with the disclaimer**; nothing hides behind the notch, status bar, home indicator or gesture bar.
- Buy/sell in **Trade**, write a **Thesis**, ask the **Coach**, send **Feedback** — the keyboard must never cover the field you're typing in.
- Android back button: closes the menu/sheet → goes back → leaves the app from the home screen.
- Feedback "Open a GitHub issue" / email and Legends source links open **outside** the app.
- Turn on airplane mode: the app still opens and works with demo prices; the Coach falls back to the built-in coach.
- Settings → **Delete my data** → type DELETE → app restarts empty.
- With the Sentia API deployed: prices say **Live**/**Delayed** (needs the CORS change in this branch deployed: `cd worker && npx wrangler deploy`).

---

## 7. Store listing, privacy and policy forms

All copy is drafted in **`STORE_LISTING.md`**; privacy and rating answers are in **`store-assets/PRIVACY_ANSWERS.md`**. URLs to paste (replace with your custom domain if you set one up):

| Field | URL |
|---|---|
| Privacy policy | `https://christiandemarco447267-dotcom.github.io/Cursor-/privacy/` |
| Terms (Apple: optional "License agreement" — leave Apple's standard EULA) | `https://christiandemarco447267-dotcom.github.io/Cursor-/terms/` |
| Support URL | `https://christiandemarco447267-dotcom.github.io/Cursor-/support/` |
| Account/data deletion URL (Google Play) | `https://christiandemarco447267-dotcom.github.io/Cursor-/delete-account/` |
| Marketing URL (optional) | `https://christiandemarco447267-dotcom.github.io/Cursor-/` |

These pages go live when the `store-ready` branch is merged to `main` and the Pages workflow runs. **Set the `NEXT_PUBLIC_FEEDBACK_EMAIL` repository variable** first so the support and deletion pages show a real contact email — both stores expect a working way to reach you.

**Google Play → Policy → App content** — complete every item:
- Privacy policy URL · App access (*All functionality is available without special access*) · Ads (*No ads*) · Content rating (IARC questionnaire) · Target audience (choose **13–15, 16–17, 18+** only; don't select under-13 groups, which would pull you into the Families policy) · Data safety · **Financial features declaration** (required for every app — declare **"My app doesn't provide any financial features"**, since there is no real money, brokerage, crypto, loans or payments) · Government apps (No) · Health (No) · Account deletion (*app doesn't let users create accounts* while accounts are off; if you turn accounts on, give the `/delete-account/` URL).
- Sources: [Financial features declaration](https://support.google.com/googleplay/android-developer/answer/13849271) · [Policy announcement (Oct 30, 2025): declaration required for every app](https://support.google.com/googleplay/android-developer/answer/16550159)

**App Store Connect → App Privacy** and **Age Rating**: answers in `store-assets/PRIVACY_ANSWERS.md`.

**App Review notes (Apple) — paste and adapt:**
> Sentia is an educational paper-trading simulator. All money, prices, orders and balances are simulated; the app never handles real money, connects to no brokerage, and offers no financial services or in-app purchases. No account or login is required — everything is stored on the device. Optional features: live delayed market quotes (ticker symbols only are sent to our API), an AI coach that answers educational questions about the user's simulated portfolio, and an in-app feedback form. Native features beyond the website: works fully offline, native haptics, Android back-button handling, links opened in the system browser, and an in-app "Delete my data" control in Settings.

---

## 8. What reviewers check (and how Sentia answers it)

- **Apple 4.2 Minimum Functionality** (no "repackaged websites"): Sentia is a complete, interactive app — trading simulator, portfolio, theses, insights, coach, Time Machine, Legends. Native value-adds in this build: **works fully offline** (everything is bundled on the device; it's not loading a website), **native haptics** on celebrations, native **status bar/splash/keyboard** handling, **Android back button**, external links in the system browser. **Push notifications are not implemented yet** — a good next step (e.g. price-alert notifications via `@capacitor/local-notifications`) if a reviewer asks for more native functionality.
- **Apple 5.1.1(v) Account deletion**: required only if users can create accounts. Accounts are off in the app; if you turn them on, Settings → Delete my data already deletes the Firebase account and its cloud data.
- **Apple 2.1 App completeness**: no placeholder content, no broken links, no "beta" wording. Make sure the Support URL works and shows contact info.
- **Apple 3.1.1 / Google Payments**: no purchases or paid features → nothing to configure.
- **Gambling / real-money language**: the app and listings say *simulated*, *paper*, *practice*; never *win money*, *cash out*, *bet*. Leagues rank discipline, not money.
- **Financial disclaimers**: shown at onboarding, in Settings → About, in Terms, and in the listing description.
- **Google Data safety accuracy**: must match what the app actually sends (see `store-assets/PRIVACY_ANSWERS.md`). If you change analytics, feedback or the coach, update the form.
- **Google target API / 64-bit / AAB**: handled by the Capacitor 8 template (API 36, AAB build).

---

## 9. Accounts in the app (Firebase) — currently OFF

The website can offer Firebase sign-in when `NEXT_PUBLIC_FIREBASE_*` is set. In the **app build** accounts stay off unless you also set `NEXT_PUBLIC_NATIVE_FIREBASE=true`, because the web sign-in flows don't work inside a native WebView without extra setup. Before turning them on:
1. Firebase console → Authentication → Settings → **Authorized domains**: add `localhost` (covers `https://localhost` on Android). iOS's `capacitor://localhost` scheme is not accepted by web auth for some flows, which is why a native plugin is recommended.
2. Prefer the community plugin **`@capacitor-firebase/authentication`** (native sign-in, then pass the credential to the JS SDK) — or keep email + password only.
3. **Email-link sign-in** and **SMS two-step (reCAPTCHA)** need extra native configuration (Dynamic/App Links or the plugin's native phone auth) — keep them off in the app until tested.
4. Then: Apple **requires in-app account deletion** (already built: Settings → Delete my data → deletes cloud data + account after re-confirming identity), Google requires the `/delete-account/` URL in the Data safety form, and both privacy forms must add "Email address — linked to the user — App functionality".

---

## 10. Release

- **Google Play:** after production access is granted → *Production → Create new release* → upload the same (or a newer) `.aab` → roll out (start at 20% if you like) → Google reviews (hours to a few days).
- **Apple:** App Store Connect → your version → pick the build → fill listing, privacy, age rating, review notes → **Add for Review** → **Submit**. Choose *Manually release this version* if you want to press the button yourself after approval.

---

## 11. Things I could not do from here

- **Build a signed `.aab` or `.ipa`.** The sandbox used to prepare this branch is an ARM64 Linux machine without the Android SDK, and Android's build tools (`aapt2`) don't run there; iOS builds need macOS + Xcode. The Android and iOS projects were generated and synced successfully (`npx cap sync`) but not compiled — do the first compile in Android Studio / Xcode and fix anything they flag.
- **Enroll, pay fees, create store listings, recruit testers, upload or submit.** All yours.
- **Deploy the Worker CORS change** (`cd worker && npx wrangler deploy`) — needed before live prices work in the apps.
- **Final art.** Icons were generated from the 256px `public/icon.png`; for crisp store art, have a designer supply a 1024×1024 master (no transparency) and re-run `npm run assets:generate`.

---

## Quick command reference

| Task | Command |
|---|---|
| Web dev server | `npm run dev` |
| Website (server) build | `npm run build` |
| GitHub Pages build locally (`/Cursor-`) | `npm run build:pages` |
| App bundle + sync native projects | `npm run build:mobile` |
| Open Android Studio / Xcode | `npm run cap:android` / `npm run cap:ios` |
| Regenerate icons & splash | `npm run assets:generate` (ImageMagick) |
| Checks | `npm run typecheck && npm run lint && npm test && (cd worker && npm test)` |
