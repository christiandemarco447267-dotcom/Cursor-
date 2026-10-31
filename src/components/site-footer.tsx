import Link from "next/link";

/** Shared footer for public (marketing / legal) pages. */
export function SiteFooter() {
  return (
    <footer className="site-footer stack gap-sm">
      <nav aria-label="Legal" className="row wrap gap-md small">
        <Link href="/privacy" className="footer-link">
          Privacy
        </Link>
        <Link href="/terms" className="footer-link">
          Terms
        </Link>
        <Link href="/support" className="footer-link">
          Support
        </Link>
        <Link href="/delete-account" className="footer-link">
          Delete your data
        </Link>
        <Link href="/app" className="footer-link">
          Open app
        </Link>
      </nav>
      <p className="disclaimer">
        Sentia is educational paper-trading software. It is not investment advice, not a brokerage, and holds no real
        money. Prices are simulated unless a market data key is configured.
      </p>
    </footer>
  );
}
