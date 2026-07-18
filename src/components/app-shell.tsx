import { BottomNav } from "@/components/bottom-nav";

export function AppShell({
  children,
  title,
  action,
}: {
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 pb-28 pt-5">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="font-[family-name:var(--font-newsreader)] text-2xl tracking-tight text-ink">
            AInvestPro
          </p>
          {title ? (
            <p className="mt-0.5 text-sm text-muted">{title}</p>
          ) : null}
        </div>
        {action}
      </header>
      <main>{children}</main>
      <BottomNav />
    </div>
  );
}
