import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { FEEDBACK_EMAIL, GITHUB_ISSUES_URL } from "@/lib/feedback";
import { SIM_DISCLAIMER } from "@/lib/site";

export const metadata: Metadata = {
  title: "Help & support",
  description: "Get help with Sentia, the paper-trading practice app: contact, common questions, and your data.",
};

export default function SupportPage() {
  return (
    <LegalPage eyebrow="Help" title="Help & support" updated="October 30, 2026">
      <section className="stack gap-sm">
        <h2>Contact</h2>
        <ul className="muted">
          <li>
            <strong>In the app:</strong> tap <strong>Feedback</strong> in the menu to report a bug or share an idea.
          </li>
          {FEEDBACK_EMAIL ? (
            <li>
              <strong>Email:</strong> <a href={`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent("Sentia support")}`}>{FEEDBACK_EMAIL}</a>{" "}
              — we aim to reply within 3 business days.
            </li>
          ) : null}
          <li>
            <strong>GitHub:</strong>{" "}
            <a href={GITHUB_ISSUES_URL} target="_blank" rel="noreferrer">
              open an issue
            </a>{" "}
            (public — don&apos;t include personal details).
          </li>
        </ul>
      </section>

      <section className="stack gap-sm">
        <h2>Common questions</h2>
        <ul className="muted">
          <li>
            <strong>Is this real money?</strong> No. {SIM_DISCLAIMER} You can&apos;t deposit, withdraw, win or lose real
            money, and no real orders are ever placed.
          </li>
          <li>
            <strong>Why do prices say Demo?</strong> When the live price service can&apos;t be reached, Sentia switches to
            clearly labelled simulated prices and pauses orders that need a live price.
          </li>
          <li>
            <strong>Does it work offline?</strong> Yes. Your portfolio is stored on your device; live prices and the AI
            coach need a connection.
          </li>
          <li>
            <strong>How do I move my data to another phone?</strong> Settings → Export JSON, then Import JSON on the other
            device.
          </li>
          <li>
            <strong>How do I delete my data?</strong> See <Link href="/delete-account">Delete your data and account</Link>.
          </li>
        </ul>
      </section>

      <section className="stack gap-sm">
        <h2>Policies</h2>
        <p className="muted">
          <Link href="/privacy">Privacy policy</Link> · <Link href="/terms">Terms of use</Link>
        </p>
      </section>
    </LegalPage>
  );
}
