"use client";

import { useMemo } from "react";
import { formatCurrency, formatPercent } from "@/lib/format";
import { allocationSlices } from "@/lib/portfolio";
import { useApp } from "@/lib/store";
import { EmptyState, Loading, Panel, PageHeader } from "./ui";

const COLORS = ["#3b82f6", "#a3e635", "#38bdf8", "#818cf8", "#22d3ee", "#4ade80", "#60a5fa", "#c084fc", "#facc15", "#94a3b8"];

export function AllocateView() {
  const { ready, summary } = useApp();
  const slices = useMemo(() => (summary ? allocationSlices(summary) : []), [summary]);

  if (!ready || !summary) return <Loading />;

  return (
    <div className="stack gap-lg animate-in">
      <PageHeader title="Allocation" subtitle="How your total value is distributed across positions and cash." />

      {slices.length === 0 ? (
        <EmptyState title="Nothing to allocate yet" hint="Add cash or buy a position to see your allocation." />
      ) : (
        <Panel className="stack gap-lg">
          <div className="alloc-bar">
            {slices.map((slice, i) => (
              <div
                key={slice.key}
                className="alloc-seg"
                style={{ width: `${slice.percent}%`, background: COLORS[i % COLORS.length] }}
                title={`${slice.label} ${formatPercent(slice.percent)}`}
              />
            ))}
          </div>
          <div className="list">
            {slices.map((slice, i) => (
              <div key={slice.key} className="list-row">
                <span className="legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
                <strong className="grow">{slice.label}</strong>
                <span className="muted">{formatCurrency(slice.value)}</span>
                <span style={{ minWidth: 64, textAlign: "right" }}>{formatPercent(slice.percent)}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
