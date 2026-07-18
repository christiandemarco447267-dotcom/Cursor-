const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

export function formatMoney(value: number): string {
  return currency.format(value);
}

export function formatCompactMoney(value: number): string {
  return compactCurrency.format(value);
}

export function formatPercent(ratio: number): string {
  return percent.format(ratio);
}

export function greetingFor(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
