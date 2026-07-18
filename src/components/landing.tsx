import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Lock, ShieldCheck, Sparkles } from "lucide-react";

export function Landing() {
  return (
    <div className="landing">
      <div className="landing-atmosphere" aria-hidden />
      <header className="landing-nav">
        <div className="brand-mark">
          <Image src="/icon.png" alt="" width={40} height={40} />
          <span>AInvestPro</span>
        </div>
        <Link href="/app" className="btn btn-primary">
          Open app
        </Link>
      </header>

      <main className="landing-hero">
        <p className="brand-hero motion-1">AInvestPro</p>
        <h1 className="motion-2">Invest with process, not impulse.</h1>
        <p className="hero-support motion-3">
          A professional paper portfolio coach — goals, theses, lessons, and
          mood check-ins — rebuilt for stability and secure-by-default data
          handling.
        </p>
        <div className="hero-cta motion-3">
          <Link href="/app" className="btn btn-primary">
            Launch workspace <ArrowRight size={16} />
          </Link>
          <a href="#trust" className="btn btn-ghost">
            Why it&apos;s safer
          </a>
        </div>
      </main>

      <section id="trust" className="landing-trust">
        <article>
          <ShieldCheck size={22} />
          <h2>Validated local data</h2>
          <p>Every save passes Zod schema checks before it touches storage.</p>
        </article>
        <article>
          <Lock size={22} />
          <h2>Server-side market proxy</h2>
          <p>API keys never ship to the browser; quotes are rate-limited.</p>
        </article>
        <article>
          <Sparkles size={22} />
          <h2>Process coaching</h2>
          <p>Gamified streaks reward habits — not hype trading tips.</p>
        </article>
      </section>

      <footer className="landing-footer">
        <p>
          Educational software only. Not a broker, advisor, or offer to sell
          securities. Rebuilt from the Vibecode AInvestPro prototype for a more
          professional foundation.
        </p>
      </footer>
    </div>
  );
}
