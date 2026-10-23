import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { assetPath } from "@/lib/asset";
import { SiteFooter } from "./site-footer";

/** Layout for static public pages (privacy, terms), styled like the landing page. */
export function LegalPage({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="landing">
      <div className="hero-grid-bg" style={{ backgroundImage: `url(${assetPath("/hero-grid.svg")})` }} />
      <div className="container" style={{ position: "relative" }}>
        <header className="row between" style={{ padding: "24px 0" }}>
          <Link href="/" className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={assetPath("/icon.png")} alt="" className="brand-mark" width={36} height={36} />
            Sentia
          </Link>
          <Link href="/app" className="btn btn-sm">
            Open app <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </header>

        <article className="legal stack gap-lg animate-in">
          <div className="stack gap-sm">
            <Link href="/" className="small muted row gap-sm footer-link" style={{ width: "fit-content" }}>
              <ArrowLeft size={14} aria-hidden="true" /> Back to home
            </Link>
            <span className="eyebrow">{eyebrow}</span>
            <h1 className="display-xl">{title}</h1>
            <p className="small muted">Last updated {updated}</p>
          </div>
          <div className="panel legal-body stack gap-md">{children}</div>
        </article>

        <SiteFooter />
      </div>
    </main>
  );
}
