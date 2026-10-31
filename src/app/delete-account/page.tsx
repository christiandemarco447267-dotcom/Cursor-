import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { FEEDBACK_EMAIL, GITHUB_ISSUES_URL } from "@/lib/feedback";

export const metadata: Metadata = {
  title: "Delete your data",
  description: "How to delete your Sentia data and account, in the app or on the web, and what is removed.",
};

export default function DeleteAccountPage() {
  return (
    <LegalPage eyebrow="Your data" title="Delete your data and account" updated="October 30, 2026">
      <section className="stack gap-sm">
        <h2>Delete everything from inside Sentia (fastest)</h2>
        <ol className="muted">
          <li>
            Open Sentia (the Android or iPhone app, or the website) and go to <strong>Settings</strong>.
          </li>
          <li>
            Scroll to <strong>Delete my data</strong> and tap <strong>Delete my data…</strong>.
          </li>
          <li>
            Type <strong>DELETE</strong> and confirm. If you are signed in to an account you will be asked to confirm
            your identity first.
          </li>
        </ol>
        <p className="muted">
          It happens immediately. You can <Link href="/app/settings">open Settings now</Link>.
        </p>
      </section>

      <section className="stack gap-sm">
        <h2>What is deleted</h2>
        <ul className="muted">
          <li>
            <strong>On your device:</strong> your paper portfolio, trades, theses, profile, preferences (including your
            usage-statistics choice), survey status and offline copies of the app.
          </li>
          <li>
            <strong>If you have an account:</strong> your account (email address and any two-step phone number held by
            Firebase Authentication), your paper account saved in Google Cloud Firestore, and your entries in any friend
            leagues. A league&apos;s name stays for its remaining members.
          </li>
          <li>
            <strong>Not linked to you, so nothing to delete:</strong> anonymous daily usage totals (no IDs are stored) and
            AI coach questions (not stored by Sentia).
          </li>
          <li>
            <strong>Feedback you sent</strong> is kept for up to one year and contains your email only if you typed it.
            To have it deleted sooner, ask using the contact below and include roughly when you sent it and what it said.
          </li>
        </ul>
        <p className="muted">
          Uninstalling the app also removes everything stored on that device. Deletion can&apos;t be undone; use{" "}
          <strong>Settings → Export JSON</strong> first if you want a copy.
        </p>
      </section>

      <section className="stack gap-sm">
        <h2>Can&apos;t open the app?</h2>
        <p className="muted">
          Ask us to delete your account{" "}
          {FEEDBACK_EMAIL ? (
            <>
              by emailing <a href={`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent("Delete my Sentia account")}`}>{FEEDBACK_EMAIL}</a>{" "}
              from the address you signed up with
            </>
          ) : (
            <>
              through the <Link href="/support">support page</Link>
            </>
          )}
          . We&apos;ll confirm and complete it within 30 days. Please don&apos;t post your email address in a public{" "}
          <a href={GITHUB_ISSUES_URL} target="_blank" rel="noreferrer">
            GitHub issue
          </a>
          .
        </p>
      </section>
    </LegalPage>
  );
}
