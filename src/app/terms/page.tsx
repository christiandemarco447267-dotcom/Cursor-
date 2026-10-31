import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "Sentia is educational paper-trading software. It is not investment advice and not a brokerage.",
};

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Legal" title="Terms of use" updated="October 30, 2026">
      <section className="stack gap-sm">
        <h2>Educational use only</h2>
        <p className="muted">
          Sentia (the website and the Android and iOS apps) is a paper-trading simulator for practicing an investing
          process. <strong>Simulated paper trading. No real money. Not investment advice.</strong> It is provided for educational and
          informational purposes only. Nothing in Sentia — including insights, coaching, prices, or examples — is
          investment, financial, tax, or legal advice, or a recommendation to buy or sell any security.
        </p>
      </section>

      <section className="stack gap-sm">
        <h2>Not a brokerage</h2>
        <p className="muted">
          Sentia is not a broker-dealer, investment adviser, or financial institution. It does not hold money, execute
          real trades, or connect to any brokerage account. All balances, trades, and gains or losses are simulated.
          There is nothing to deposit, wager, win or cash out, and no in-app purchases.
        </p>
      </section>

      <section className="stack gap-sm">
        <h2>Market data</h2>
        <p className="muted">
          Prices are simulated unless the build is connected to the optional Sentia price service (quotes from Finnhub,
          or Yahoo Finance as a fallback). Even then, quotes may be delayed, incomplete, or inaccurate and must not be relied on for real
          trading decisions.
        </p>
      </section>

      <section className="stack gap-sm">
        <h2>Your data</h2>
        <p className="muted">
          Your data is stored on your device (or in your account, if accounts are enabled and you sign in). You are
          responsible for backing it up with Export JSON; it is lost if browser storage is cleared or the app is
          uninstalled. You can delete it at any time (see <Link href="/delete-account">Delete your data</Link>). See the{" "}
          <Link href="/privacy">Privacy policy</Link> for details.
        </p>
      </section>

      <section className="stack gap-sm">
        <h2>AI coach</h2>
        <p className="muted">
          Answers from the AI coach are generated automatically, can be wrong, and are educational only. Don&apos;t rely
          on them for real financial decisions. Don&apos;t use the coach to submit unlawful or abusive content.
        </p>
      </section>

      <section className="stack gap-sm">
        <h2>App stores</h2>
        <p className="muted">
          If you downloaded Sentia from the Apple App Store or Google Play, the store&apos;s own terms (for Apple, the
          Licensed Application End User License Agreement) also apply; Apple and Google are not responsible for Sentia or
          its support. Questions go to <Link href="/support">Help &amp; support</Link>.
        </p>
      </section>

      <section className="stack gap-sm">
        <h2>No warranty</h2>
        <p className="muted">
          Sentia is open-source software provided &ldquo;as is&rdquo;, without warranty of any kind, under the MIT
          License. To the fullest extent permitted by law, the authors are not liable for any loss or damage arising
          from its use, including any decision made based on it.
        </p>
      </section>

      <section className="stack gap-sm">
        <h2>Changes</h2>
        <p className="muted">
          These terms may be updated from time to time; the date above reflects the latest version. Continued use of
          Sentia means you accept the current terms.
        </p>
      </section>
    </LegalPage>
  );
}
