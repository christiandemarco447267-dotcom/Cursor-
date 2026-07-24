import Link from "next/link";
import { ArrowRight, LineChart, Lock, ShieldCheck, Sparkles } from "lucide-react";

const TRUST = [
  {
    icon: LineChart,
    title: "Real paper trading",
    body: "Buy and sell against a cash balance with weighted-average cost basis and realized P/L — a genuine simulation, not a static list.",
  },
  {
    icon: ShieldCheck,
    title: "Validated, versioned data",
    body: "Every write is checked with Zod and stored under a versioned schema with an automatic migration path.",
  },
  {
    icon: Lock,
    title: "Local-first & private",
    body: "Your portfolio lives in your browser. The market proxy keeps any API key server-side and ships strict security headers.",
  },
];

export function Landing() {
  return (
    <main className="landing">
      <div className="hero-grid-bg" />
      <div className="container" style={{ position: "relative" }}>
        <header className="row between" style={{ padding: "24px 0" }}>
          <div className="brand">
            <span className="brand-mark">A</span>
            AInvestPro
          </div>
          <Link href="/app" className="btn btn-sm">
            Open app <ArrowRight size={16} />
          </Link>
        </header>

        <section className="landing-hero stack gap-lg animate-in" style={{ maxWidth: 720 }}>
          <span className="pill pill-primary" style={{ width: "fit-content" }}>
            <Sparkles size={15} /> Invest with process, not impulse
          </span>
          <h1 className="display-xl">
            A calmer way to practice investing — with a real process behind every trade.
          </h1>
          <p className="muted" style={{ fontSize: 18, maxWidth: 620 }}>
            AInvestPro is an educational paper-trading coach. Simulate buys and sells, write a thesis for every position,
            set goals, log your mood, and build durable habits — all with local-first, validated data.
          </p>
          <div className="row wrap gap-md">
            <Link href="/app" className="btn btn-primary">
              Launch the workspace <ArrowRight size={16} />
            </Link>
            <Link href="/app/learn" className="btn">
              Explore the lessons
            </Link>
          </div>
        </section>

        <section className="grid grid-3" style={{ padding: "24px 0 64px" }}>
          {TRUST.map(({ icon: Icon, title, body }) => (
            <div key={title} className="panel trust-card">
              <span className="trust-icon">
                <Icon size={20} />
              </span>
              <strong>{title}</strong>
              <span className="small muted">{body}</span>
            </div>
          ))}
        </section>

        <footer className="disclaimer" style={{ padding: "0 0 48px" }}>
          AInvestPro is educational paper-trading software. It is not investment advice, not a brokerage, and holds no
          real money. Prices are simulated unless a market data key is configured.
        </footer>
      </div>
    </main>
  );
}
