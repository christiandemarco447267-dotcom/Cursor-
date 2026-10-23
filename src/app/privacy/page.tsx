import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Sentia handles your data: demo mode stays in your browser; optional accounts sync your paper portfolio privately. No tracking.",
};

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Legal" title="Privacy" updated="October 23, 2026">
      <section className="stack gap-sm">
        <h2>The short version</h2>
        <p className="muted">
          In demo mode, your portfolio, trades, theses, and profile live only in your own browser. Where accounts are
          enabled, you can optionally sign in so your paper account is saved to your account and synced across your
          devices. We do not sell or share your data, and Sentia adds no tracking.
        </p>
      </section>

      <section className="stack gap-sm">
        <h2>What is stored, and where</h2>
        <ul className="muted">
          <li>
            Everything you enter (cash balance, holdings, transactions, theses, profile name and preferences) is saved
            in your browser&apos;s <code>localStorage</code> on the device you are using.
          </li>
          <li>
            <strong>Demo mode:</strong> nothing you enter is sent to a server.
          </li>
          <li>
            <strong>Signed-in accounts</strong> (when the deployment has accounts enabled): your email address and, if you
            turn on two-step verification, your phone number are held by Firebase Authentication (Google). Your paper
            account (cash, holdings, ledger, theses, profile) is stored in Google Cloud Firestore under your account, and
            security rules allow only you — signed in with a verified email — to read or change it.
          </li>
          <li>
            In demo mode, clearing your browser data, or using <strong>Reset workspace</strong> in Settings, permanently
            deletes it. For accounts, <strong>Reset workspace</strong> replaces the saved copy.
            Use <strong>Export JSON</strong> in Settings to keep your own backup.
          </li>
        </ul>
      </section>

      <section className="stack gap-sm">
        <h2>Market data</h2>
        <p className="muted">
          By default — and always on the public demo site — prices are simulated in your browser and no market data
          request leaves your device. On self-hosted builds the operator may configure an optional Finnhub API key. In
          that case the ticker symbols being displayed are sent to Finnhub (directly or via the app&apos;s own server
          route) to fetch quotes. Finnhub&apos;s own privacy policy applies to those requests. Your holdings,
          quantities, and other data are never sent.
        </p>
      </section>

      <section className="stack gap-sm">
        <h2>Hosting</h2>
        <p className="muted">
          The public demo is served as static files by GitHub Pages. GitHub may log standard technical information
          (such as IP address and browser type) when serving pages, under GitHub&apos;s privacy statement. Sentia
          itself adds no analytics, cookies, or tracking scripts.
        </p>
      </section>

      <section className="stack gap-sm">
        <h2>Changes and contact</h2>
        <p className="muted">
          If this policy changes, the date above will be updated. Questions can be raised on the project&apos;s GitHub
          repository. See also the <Link href="/terms">Terms of use</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
