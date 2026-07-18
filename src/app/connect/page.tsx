import { SiteHeader } from "@/components/site-header";
import { ConnectFlow } from "@/components/connect-flow";
import { getBankingMode } from "@/lib/banking/provider";

export default function ConnectPage() {
  const mode = getBankingMode();

  return (
    <main className="atmosphere flex flex-1 flex-col">
      <div className="relative">
        <SiteHeader />
        <div className="mx-auto grid min-h-[100svh] w-full max-w-6xl items-center gap-12 px-5 pb-16 pt-28 sm:px-8 md:grid-cols-2 md:gap-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">
              Secure bank link
            </p>
            <h1 className="mt-4 font-display text-5xl leading-tight text-ink sm:text-6xl">
              Connect once.
              <br />
              Advise from reality.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
              Harbor reads balances and transactions through banking data APIs,
              then builds advice around your actual cash flow, debt, and savings
              runway.
            </p>
          </div>
          <ConnectFlow mode={mode} />
        </div>
      </div>
    </main>
  );
}
