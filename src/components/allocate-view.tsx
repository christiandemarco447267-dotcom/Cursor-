"use client";

import { useApp } from "@/lib/app-context";
import { allocationSlices } from "@/lib/portfolio";
import { formatCurrency, formatPercent } from "@/lib/format";
import { PageHeader, Panel } from "@/components/ui";

const COLORS = [
  "#0f766e",
  "#1d4e89",
  "#b45309",
  "#0e7490",
  "#365314",
  "#9a3412",
  "#334155",
];

export function AllocateView() {
  const { summary } = useApp();
  const slices = allocationSlices(summary);

  return (
    <div className="stack gap-lg animate-in">
      <PageHeader
        title="Allocation"
        subtitle="See how cash and positions share your paper portfolio."
      />
      <Panel className="alloc-panel">
        <div className="alloc-bar" aria-hidden>
          {slices.map((slice, i) => (
            <div
              key={slice.label}
              style={{
                width: `${Math.max(slice.percent, 0)}%`,
                background: COLORS[i % COLORS.length],
              }}
              title={`${slice.label}: ${formatPercent(slice.percent)}`}
            />
          ))}
        </div>
        <ul className="alloc-list">
          {slices.map((slice, i) => (
            <li key={slice.label}>
              <span
                className="swatch"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <strong>{slice.label}</strong>
              <span className="muted">{formatCurrency(slice.value)}</span>
              <span>{formatPercent(slice.percent)}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
