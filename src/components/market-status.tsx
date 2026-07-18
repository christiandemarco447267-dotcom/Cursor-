"use client";

export function MarketStatus({
  loading,
  source,
}: {
  loading: boolean;
  source: "live" | "demo" | null;
}) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-surface/70 px-3 py-2 text-xs text-muted">
      <span
        className={`h-2 w-2 rounded-sm ${
          loading
            ? "animate-pulse-line bg-amber"
            : source === "live"
              ? "bg-gain"
              : "bg-teal"
        }`}
      />
      {loading
        ? "Refreshing market data…"
        : source === "live"
          ? "Live quotes connected"
          : "Demo market data"}
    </div>
  );
}
