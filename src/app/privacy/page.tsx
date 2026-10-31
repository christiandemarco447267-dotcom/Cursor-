import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Sentia (website, Android and iOS apps) handles your data: your paper portfolio stays on your device or in your account; optional feedback, opt-in anonymous usage counts and the AI coach are described exactly here.",
};

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Legal" title="Privacy" updated="October 30, 2026">
      <section className="stack gap-sm">
        <h2>The short version</h2>
        <p className="muted">
          This policy covers the Sentia website and the Sentia apps for Android and iOS. In demo mode, your portfolio,
          trades, theses, and profile live only on your own device (in your browser, or in the app&apos;s private storage). Where accounts are
          enabled, you can optionally sign in so your paper account is saved to your account and synced across your
          devices. We do not sell your data. Sentia uses no cookies for tracking and no third-party analytics. If you opt
          in, it counts page views and a few actions anonymously (details below); it&apos;s off until you say yes.
        </p>
      </section>

      <section className="stack gap-sm">
        <h2>What is stored, and where</h2>
        <ul className="muted">
          <li>
            Everything you enter (cash balance, holdings, transactions, theses, profile name and preferences) is saved
            on the device you are using: in your browser&apos;s <code>localStorage</code> on the web, or in the
            app&apos;s private on-device storage in the Android and iOS apps. The website also keeps an offline copy of
            the app&apos;s own files (never your prices, coach answers or feedback) so it opens without a connection.
          </li>
          <li>
            <strong>Demo mode:</strong> your portfolio is never sent to a server. The only exceptions are the optional
            features below, each of which you trigger yourself (asking the AI coach, sending feedback, opting in to usage
            counts) or which send only ticker symbols (real prices).
          </li>
          <li>
            <strong>Signed-in accounts</strong> (when the deployment has accounts enabled): your email address and, if you
            turn on two-step verification, your phone number are held by Firebase Authentication (Google). Your paper
            account (cash, holdings, ledger, theses, profile) is stored in Google Cloud Firestore under your account, and
            security rules allow only you — signed in with a verified email — to read or change it.
          </li>
          <li>
            <strong>Settings → Delete my data</strong> permanently deletes everything on the device and, if you are
            signed in, your account and its cloud data too (see <Link href="/delete-account">Delete your data</Link>).
            Clearing your browser data or uninstalling the app also deletes what is on that device. For accounts, <strong>Reset workspace</strong> replaces the saved copy.
            Use <strong>Export JSON</strong> in Settings to keep your own backup.
          </li>
        </ul>
      </section>

      <section className="stack gap-sm">
        <h2>Market data</h2>
        <p className="muted">
          Without the optional Sentia API, prices are simulated in your browser, labelled <strong>Demo</strong>, and no
          market-data request leaves your device. When the deployment configures the Sentia API (a small Cloudflare
          Worker run by the site owner), your browser sends it the <strong>ticker symbols</strong> on screen; the API
          fetches quotes from Finnhub (or Yahoo Finance as a fallback) using a key kept on the server. Your holdings,
          share counts and other data are never sent for prices. Like any web server, Cloudflare processes your IP
          address to deliver the request; the API uses it only in memory for rate limiting and doesn&apos;t store it.
        </p>
      </section>

      <section className="stack gap-sm">
        <h2>Feedback and the survey</h2>
        <ul className="muted">
          <li>
            When you press <strong>Send feedback</strong>, Sentia sends: the type (bug, idea or praise), your message,
            your email only if you typed one, and — if the &ldquo;technical details&rdquo; box is ticked (it is by
            default and you can untick it) — the page you were on, the app version, your screen size, your
            browser&apos;s user-agent string and whether prices were live or demo.
          </li>
          <li>
            A summary of your paper portfolio (total value, cash, tickers and share counts) is included{" "}
            <strong>only if you tick that box</strong>. It is unticked by default.
          </li>
          <li>
            The one-time survey (shown once, about a week after you start) sends your 1–5 rating and your optional
            answer, nothing else.
          </li>
          <li>
            Messages are stored in the site owner&apos;s Cloudflare account (Workers KV) for up to one year and may be
            forwarded to the owner&apos;s private Discord or Slack channel. Only the owner can read them. To stop spam,
            the API keeps a short-lived counter keyed by a one-way hash of your IP address (the hash changes daily and
            the counter expires within an hour); the IP address itself isn&apos;t stored.
          </li>
          <li>
            On builds without the Sentia API, the feedback button instead opens a prefilled email or a GitHub issue;
            nothing is sent until you send that email or submit the issue yourself (GitHub issues are public).
          </li>
        </ul>
      </section>

      <section className="stack gap-sm">
        <h2>Anonymous usage counts (opt-in)</h2>
        <ul className="muted">
          <li>
            Off by default. A small notice asks once; you can change your answer anytime in{" "}
            <strong>Settings → Usage statistics</strong>. Your choice is remembered in your browser&apos;s
            localStorage (not a cookie).
          </li>
          <li>
            When on, Sentia sends only: a page name (for example <code>/app/trade</code>, never query strings) when
            you open a page, and these named events when they happen: <code>trade_placed</code>,{" "}
            <code>thesis_created</code>, <code>time_machine_finished</code>, <code>coach_asked</code>,{" "}
            <code>feedback_sent</code>.
          </li>
          <li>
            The API adds them to <strong>daily totals</strong> (e.g. &ldquo;37 trades placed on Oct 30&rdquo;) and keeps
            nothing else: no cookies, no user or device ID, no IP address, no tickers, amounts or text. Totals are kept
            for about 13 months.
          </li>
        </ul>
      </section>

      <section className="stack gap-sm">
        <h2>AI coach</h2>
        <p className="muted">
          Quick-question chips and the offline coach run entirely in your browser. When the deployment has the AI coach
          enabled and you type a question in Ask Sentia, your question and a short summary of your paper account are
          sent through the Sentia API to an AI provider (OpenAI or Anthropic, as configured by the site owner) to write
          the answer. The summary contains: cash and total value, holdings (ticker, shares, average cost, price, value,
          gain), up to 10 recent trades with any mood tags, Bias Radar findings, your Discipline Score, your thesis
          titles/conviction/risks, and your return vs. the S&amp;P 500. It never includes your name, email or profile.
          The Sentia API doesn&apos;t store questions or answers; the provider processes them under its own API terms.
          The API counts questions per visitor per day (using a one-way hash of the IP address that changes daily) to
          cap costs.
        </p>
      </section>

      <section className="stack gap-sm">
        <h2>The Android and iOS apps</h2>
        <ul className="muted">
          <li>
            The apps run the same code as the website, packaged with all its files, so they work offline. They ask for
            no device permissions beyond internet access: no location, contacts, camera, photos, microphone or
            advertising identifier, and they contain no advertising or third-party tracking SDKs.
          </li>
          <li>
            Accounts are not offered in the apps today, so everything stays on your phone. If they are added, the
            account section above applies and you will be able to delete your account from Settings.
          </li>
          <li>
            Links to other sites (for example GitHub, or a source in Legends) open in your phone&apos;s browser, under
            that site&apos;s own privacy policy. A feedback email opens in your own mail app.
          </li>
          <li>
            Apple and Google may collect crash and usage diagnostics about apps you install under their own policies
            and your device settings; Sentia doesn&apos;t receive personal information from them.
          </li>
        </ul>
      </section>

      <section className="stack gap-sm">
        <h2>Children</h2>
        <p className="muted">
          Sentia is a general-audience education app and is not directed at children under 13. We don&apos;t knowingly
          collect personal information from children.
        </p>
      </section>

      <section className="stack gap-sm">
        <h2>Hosting</h2>
        <p className="muted">
          The public demo is served as static files by GitHub Pages. GitHub may log standard technical information
          (such as IP address and browser type) when serving pages, under GitHub&apos;s privacy statement. Sentia
          itself adds no cookies, third-party analytics or tracking scripts; its only usage measurement is the opt-in
          anonymous counts described above.
        </p>
      </section>

      <section className="stack gap-sm">
        <h2>Changes and contact</h2>
        <p className="muted">
          If this policy changes, the date above will be updated. For questions or data requests, see{" "}
          <Link href="/support">Help &amp; support</Link>. See also the <Link href="/terms">Terms of use</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
