import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Sentia handles your data: everything stays in your browser. No accounts, no tracking, no server-side storage.",
};

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Legal" title="Privacy" updated="October 19, 2026">
      <section className="stack gap-sm">
        <h2>The short version</h2>
        <p className="muted">
          Sentia is local-first. Your portfolio, trades, theses, and profile live in your own browser. There are no
          accounts, and we do not collect, sell, or share your data.
        </p>
      </section>

      <section className="stack gap-sm">
        <h2>What is stored, and where</h2>
        <ul className="muted">
          <li>
            Everything you enter (cash balance, holdings, transactions, theses, profile name and preferences) is saved
            in your browser&apos;s <code>localStorage</code> on the device you are using.
          </li>
          <li>Nothing you enter is sent to a Sentia server. There is no Sentia database and no sign-in.</li>
          <li>
            Clearing your browser data, or using <strong>Reset workspace</strong> in Settings, permanently deletes it.
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
