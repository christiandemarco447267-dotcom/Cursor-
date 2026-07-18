import Link from "next/link";

export function SiteHeader({
  variant = "light",
}: {
  variant?: "light" | "overlay";
}) {
  const overlay = variant === "overlay";

  return (
    <header
      className={`absolute inset-x-0 top-0 z-20 ${
        overlay ? "text-white" : "text-ink"
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="font-display text-2xl tracking-tight">
          Harbor
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link
            href="/#how"
            className={
              overlay
                ? "text-white/80 transition hover:text-white"
                : "text-ink-soft transition hover:text-ink"
            }
          >
            How it works
          </Link>
          <Link
            href="/connect"
            className={
              overlay
                ? "rounded-md bg-white px-4 py-2 text-ink transition hover:bg-mist"
                : "rounded-md bg-sea px-4 py-2 text-white transition hover:bg-sea-deep"
            }
          >
            Connect bank
          </Link>
        </nav>
      </div>
    </header>
  );
}
