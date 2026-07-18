import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="relative min-h-[100svh] overflow-hidden">
        <Image
          src="/harbor-hero.jpg"
          alt="Calm morning harbor water with soft coastal mist"
          fill
          priority
          className="animate-drift object-cover"
          sizes="100vw"
        />
        <div className="hero-scrim absolute inset-0" />
        <SiteHeader variant="overlay" />

        <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col justify-end px-5 pb-16 pt-28 sm:px-8 sm:pb-20">
          <p className="animate-rise font-display text-6xl leading-none tracking-tight text-white sm:text-8xl md:text-9xl">
            Harbor
          </p>
          <h1 className="animate-rise-delay-1 mt-5 max-w-xl font-display text-2xl font-medium leading-snug text-white sm:text-3xl">
            Advice shaped by your actual cash flow—not generic tips.
          </h1>
          <p className="animate-rise-delay-2 mt-4 max-w-lg text-base leading-relaxed text-white/85 sm:text-lg">
            Connect your bank once. Harbor reads balances, spending, and debt
            signals to tailor what you should do next.
          </p>
          <div className="animate-rise-delay-3 mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/connect"
              className="rounded-md bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:bg-mist"
            >
              Connect your bank
            </Link>
            <Link
              href="/#how"
              className="text-sm font-medium text-white/90 underline decoration-white/40 underline-offset-4 transition hover:decoration-white"
            >
              See how it works
            </Link>
          </div>
        </div>
      </section>

      <section id="how" className="atmosphere border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 md:grid-cols-[1.1fr_0.9fr] md:gap-16 md:py-28">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">
              How it works
            </p>
            <h2 className="mt-4 font-display text-4xl leading-tight text-ink sm:text-5xl">
              Banking data in. Clear next moves out.
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
              Harbor uses secure banking APIs (Plaid when configured, sandbox
              demo otherwise) to understand your circumstances before advising.
            </p>
          </div>

          <ol className="space-y-8">
            {[
              {
                step: "01",
                title: "Link accounts",
                body: "Connect checking, savings, cards, and loans through a bank-grade link flow.",
              },
              {
                step: "02",
                title: "Read the signals",
                body: "We measure income rhythm, essentials, revolving debt, subscriptions, and emergency cover.",
              },
              {
                step: "03",
                title: "Get tailored advice",
                body: "Prioritized actions based on your numbers—what to pay down, save, or trim first.",
              },
            ].map((item) => (
              <li key={item.step} className="border-t border-line pt-6">
                <p className="text-xs font-semibold tracking-[0.2em] text-sea">
                  {item.step}
                </p>
                <h3 className="mt-2 font-display text-2xl text-ink">
                  {item.title}
                </h3>
                <p className="mt-2 text-base leading-relaxed text-ink-soft">
                  {item.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-line bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-5 py-16 sm:px-8 md:flex-row md:items-end md:py-20">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl">
              Ready to see your financial weather?
            </h2>
            <p className="mt-3 max-w-md text-white/75">
              Start with the sandbox demo—or plug in Plaid credentials for live
              bank data.
            </p>
          </div>
          <Link
            href="/connect"
            className="rounded-md bg-sea px-6 py-3 text-sm font-semibold text-white transition hover:bg-sea-deep"
          >
            Open Harbor
          </Link>
        </div>
      </section>
    </main>
  );
}
