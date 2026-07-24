"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import { sparklineForSymbol } from "@/lib/market";

export function Loading({ label = "Loading your workspace…" }: { label?: string }) {
  return (
    <div className="loading-block">
      <span className="spinner" aria-hidden="true" />
      <span className="small">{label}</span>
    </div>
  );
}

export function Panel({
  children,
  className,
  strong,
}: {
  children: ReactNode;
  className?: string;
  strong?: boolean;
}) {
  return <div className={clsx("panel", strong && "panel-strong", className)}>{children}</div>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="row between wrap gap-md" style={{ marginBottom: 20 }}>
      <div className="page-header">
        <h1>{title}</h1>
        {subtitle ? <p className="muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "gain" | "loss" }) {
  return (
    <Panel className="stack gap-sm">
      <span className="eyebrow">{label}</span>
      <span className={clsx("value-lg", tone)}>{value}</span>
      {hint ? <span className="small muted">{hint}</span> : null}
    </Panel>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty stack gap-sm">
      <strong>{title}</strong>
      {hint ? <span className="small">{hint}</span> : null}
    </div>
  );
}

export function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(clamped)} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function Sparkline({ symbol, width = 88, height = 30 }: { symbol: string; width?: number; height?: number }) {
  const series = sparklineForSymbol(symbol, 24);
  const max = Math.max(...series);
  const min = Math.min(...series);
  const range = max - min || 1;
  const step = width / (series.length - 1);
  const points = series
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const rising = series[series.length - 1] >= series[0];
  return (
    <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={rising ? "var(--gain)" : "var(--loss)"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
