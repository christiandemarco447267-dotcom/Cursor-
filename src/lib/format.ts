export function formatMoney(
  value: number,
  options?: { compact?: boolean; signed?: boolean },
): string {
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: options?.compact ? "compact" : "standard",
    maximumFractionDigits: abs >= 1000 && options?.compact ? 1 : 0,
  }).format(abs);

  if (options?.signed) {
    if (value > 0) return `+${formatted}`;
    if (value < 0) return `−${formatted}`;
  }
  return value < 0 ? `−${formatted}` : formatted;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}
