import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "Sentia is educational paper-trading software. It is not investment advice and not a brokerage.",
};

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Legal" title="Terms of use" updated="October 19, 2026">
      <section className="stack gap-sm">
        <h2>Educational use only</h2>
        <p className="muted">
          Sentia is a paper-trading simulator for practicing an investing process. It is provided for educational and
          informational purposes only. Nothing in Sentia — including insights, coaching, prices, or examples — is
          investment, financial, tax, or legal advice, or a recommendation to buy or sell any security.
        </p>
      </section>

      <section className="stack gap-sm">
        <h2>Not a brokerage</h2>
        <p className="muted">
          Sentia is not a broker-dealer, investment adviser, or financial institution. It does not hold money, execute
          real trades, or connect to any brokerage account. All balances, trades, and gains or losses are simulated.
        </p>
      </section>

      <section className="stack gap-sm">
        <h2>Market data</h2>
        <p className="muted">
          Prices are simulated unless a self-hosted build is configured with an optional third-party data source
          (Finnhub). Even then, quotes may be delayed, incomplete, or inaccurate and must not be relied on for real
          trading decisions.
        </p>
      </section>

      <section className="stack gap-sm">
        <h2>Your data</h2>
        <p className="muted">
          Your data is stored only in your browser. You are responsible for backing it up; it can be lost if browser
          storage is cleared. See the <Link href="/privacy">Privacy policy</Link> for details.
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
