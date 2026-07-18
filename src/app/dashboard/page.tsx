import Link from "next/link";
import { redirect } from "next/navigation";
import { DisconnectButton } from "@/components/disconnect-button";
import { WellnessScore } from "@/components/wellness-score";
import { getBankingMode, getBankingProvider } from "@/lib/banking/provider";
import { generateAdvice } from "@/lib/finance/advice";
import { buildFinancialProfile } from "@/lib/finance/analytics";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import { getSession } from "@/lib/session";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/connect");

  const provider = getBankingProvider();
  const snapshot = await provider.getSnapshot(session.itemId);
  const profile = buildFinancialProfile(snapshot.accounts, snapshot.transactions);
  const report = generateAdvice(profile);
  const mode = getBankingMode();

  const priorityStyles = {
    high: "text-signal",
    medium: "text-gold",
    low: "text-sea",
  } as const;

  return (
    <main className="atmosphere min-h-screen">
      <header className="border-b border-line/70 bg-white/50 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="font-display text-2xl tracking-tight text-ink">
            Harbor
          </Link>
          <div className="flex items-center gap-5">
            <span className="hidden text-sm text-ink-soft sm:inline">
              {session.institutionName}
              <span className="mx-2 text-line">|</span>
              {mode === "plaid" ? "Live data" : "Sandbox data"}
            </span>
            <DisconnectButton />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <section className="animate-rise">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sea">
            Your circumstances
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight text-ink sm:text-5xl">
            {report.headline}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft">
            {report.circumstances}
          </p>
          <div className="mt-8">
            <WellnessScore
              score={report.wellnessScore}
              label={report.wellnessLabel}
            />
          </div>
        </section>

        <section className="animate-rise-delay-1 mt-14 grid gap-8 border-t border-line pt-10 md:grid-cols-4">
          {[
            {
              label: "Liquid assets",
              value: formatMoney(profile.liquidAssets),
              hint: `${profile.emergencyFundMonths.toFixed(1)} months essentials`,
            },
            {
              label: "Monthly income",
              value: formatMoney(profile.monthly.income),
              hint: "Averaged from payroll deposits",
            },
            {
              label: "Savings rate",
              value: formatPercent(profile.savingsRate),
              hint: "Transfers + unspent surplus",
            },
            {
              label: "Total debt",
              value: formatMoney(profile.totalDebt),
              hint: `${formatMoney(profile.creditCardDebt)} revolving`,
            },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
                {stat.label}
              </p>
              <p className="mt-2 font-display text-3xl text-ink">{stat.value}</p>
              <p className="mt-1 text-sm text-ink-soft">{stat.hint}</p>
            </div>
          ))}
        </section>

        <section className="animate-rise-delay-2 mt-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl text-ink">Tailored advice</h2>
              <p className="mt-2 max-w-xl text-ink-soft">
                Ranked by urgency from your banking signals over the last ~90 days.
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-0">
            {report.advice.map((item, index) => (
              <article
                key={item.id}
                className="grid gap-4 border-t border-line py-8 md:grid-cols-[auto_1fr_auto]"
              >
                <p className="font-display text-2xl text-sand-cool">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-display text-2xl text-ink">{item.title}</h3>
                    <span
                      className={`text-xs font-semibold uppercase tracking-[0.14em] ${priorityStyles[item.priority]}`}
                    >
                      {item.priority} priority
                    </span>
                  </div>
                  <p className="mt-2 text-base text-ink-soft">{item.summary}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft/90">
                    {item.detail}
                  </p>
                  <p className="mt-4 text-sm font-medium text-ink">
                    Next step: {item.action}
                  </p>
                </div>
                <p className="text-sm font-semibold text-sea md:text-right">
                  {item.impactLabel}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-12 border-t border-line py-14 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl text-ink">Spending mix</h2>
            <p className="mt-2 text-ink-soft">Where money goes each month.</p>
            <ul className="mt-8 space-y-4">
              {profile.categoryBreakdown.slice(0, 6).map((cat) => (
                <li key={cat.category}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-ink">{cat.category}</span>
                    <span className="text-ink-soft">
                      {formatMoney(cat.amount)} · {formatPercent(cat.share)}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand-cool/60">
                    <div
                      className="h-full rounded-full bg-sea transition-all"
                      style={{ width: `${Math.max(4, cat.share * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-display text-3xl text-ink">Accounts</h2>
            <p className="mt-2 text-ink-soft">Synced from your linked institution.</p>
            <ul className="mt-8 divide-y divide-line">
              {snapshot.accounts.map((account) => (
                <li
                  key={account.id}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div>
                    <p className="font-medium text-ink">{account.name}</p>
                    <p className="text-sm text-ink-soft">
                      {account.subtype} ···{account.mask}
                      {account.apr ? ` · ${account.apr}% APR` : ""}
                    </p>
                  </div>
                  <p className="font-display text-xl text-ink">
                    {formatMoney(account.currentBalance)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-line py-14">
          <h2 className="font-display text-3xl text-ink">Recent activity</h2>
          <p className="mt-2 text-ink-soft">Latest posted transactions feeding the model.</p>
          <ul className="mt-8 divide-y divide-line">
            {profile.recentTransactions.map((txn) => (
              <li
                key={txn.id}
                className="flex items-center justify-between gap-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">
                    {txn.merchantName ?? txn.name}
                  </p>
                  <p className="text-ink-soft">
                    {formatDate(txn.date)} · {txn.category[txn.category.length - 1]}
                  </p>
                </div>
                <p
                  className={`shrink-0 font-medium ${
                    txn.amount < 0 ? "text-sea" : "text-ink"
                  }`}
                >
                  {txn.amount < 0
                    ? `+${formatMoney(Math.abs(txn.amount))}`
                    : formatMoney(txn.amount)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
