import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { assetPath } from "@/lib/asset";

/**
 * Branded full-page message used by not-found, error and global-error.
 * Server/client agnostic (no hooks), so error boundaries can render it.
 */
export function StatusScreen({
  code,
  title,
  body,
  actions,
}: {
  code: string;
  title: string;
  body: string;
  actions?: ReactNode;
}) {
  return (
    <main className="landing status-screen">
      <div className="hero-grid-bg" style={{ backgroundImage: `url(${assetPath("/hero-grid.svg")})` }} />
      <div className="container status-inner stack gap-lg animate-in">
        <Link href="/" className="brand" style={{ padding: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={assetPath("/icon.png")} alt="" className="brand-mark" width={36} height={36} />
          Sentia
        </Link>
        <div className="panel panel-pad-lg stack gap-md status-card">
          <span className="pill pill-primary" style={{ width: "fit-content" }}>
            {code}
          </span>
          <h1 className="display-xl status-title">{title}</h1>
          <p className="muted">{body}</p>
          <div className="row wrap gap-sm">
            <Link href="/" className="btn btn-primary">
              <ArrowLeft size={16} aria-hidden="true" /> Back to home
            </Link>
            <Link href="/app" className="btn">
              Open the workspace
            </Link>
            {actions}
          </div>
        </div>
      </div>
    </main>
  );
}
