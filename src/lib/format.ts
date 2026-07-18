export function formatCurrency(value: number, compact = false): string {
  if (!Number.isFinite(value)) return "$—";
  if (compact && Math.abs(value) >= 10_000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatSignedCurrency(value: number): string {
  if (!Number.isFinite(value)) return "$—";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatCurrency(Math.abs(value))}`;
}

export function greetingForNow(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
