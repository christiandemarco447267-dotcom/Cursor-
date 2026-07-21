export function StatChip({
  icon,
  label,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  tone?: "default" | "gain" | "warn";
}) {
  const toneClass =
    tone === "gain"
      ? "text-gain"
      : tone === "warn"
        ? "text-amber"
        : "text-ink-soft";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface/80 px-2.5 py-1.5 text-xs font-medium ${toneClass}`}
    >
      <span className="grid h-5 w-5 place-items-center rounded-lg bg-paper text-ink">
        {icon}
      </span>
      {label}
    </span>
  );
}
