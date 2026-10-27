"use client";

import clsx from "clsx";
import type { ReactNode } from "react";
import { BellRing, CircleCheck, CircleX, FlaskConical, Star, X } from "lucide-react";
import { priceSourceOf, sparklineForSymbol } from "@/lib/market";
import { useApp } from "@/lib/store";

export function Loading({ label = "Loading your workspace…" }: { label?: string }) {
  return (
    <div className="loading-block" role="status" aria-live="polite">
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
    <Panel className="holo stack gap-sm">
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

export function ProgressBar({ percent, label = "Progress" }: { percent: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(clamped)} aria-valuemin={0} aria-valuemax={100}>
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

/**
 * Small "Demo prices" badge, shown only while market data is simulated (no live
 * source — always the case on the static Pages build). Renders nothing for a
 * fully live feed.
 */
export function DemoPricesBadge({ className }: { className?: string }) {
  const { market } = useApp();
  const source = priceSourceOf(market);
  if (source !== "demo" && source !== "mixed") return null;
  const text = source === "demo" ? "Demo prices" : "Some prices simulated";
  const detail =
    source === "demo"
      ? "Prices are simulated for practice. They are not real market data."
      : "Live quotes were unavailable for some symbols, so those prices are simulated.";
  return (
    <span className={clsx("pill pill-demo", className)} role="status" title={detail}>
      <FlaskConical size={13} />
      {text}
      <span className="sr-only">. {detail}</span>
    </span>
  );
}

/** Star / unstar a ticker on the watchlist. */
export function StarButton({ symbol, withLabel }: { symbol: string; withLabel?: boolean }) {
  const { state, actions } = useApp();
  if (!state) return null;
  const upper = symbol.trim().toUpperCase();
  const watched = state.watchlist.some((w) => w.toUpperCase() === upper);
  const label = watched ? `Remove ${upper} from watchlist` : `Add ${upper} to watchlist`;
  return (
    <button
      type="button"
      className={clsx("btn btn-sm star-btn", watched && "starred", !withLabel && "btn-icon")}
      onClick={() => {
        try {
          actions.toggleWatch(upper);
        } catch {
          // Watchlist full or invalid symbol: nothing to toggle.
        }
      }}
      aria-pressed={watched}
      aria-label={label}
      title={label}
    >
      <Star size={15} fill={watched ? "currentColor" : "none"} />
      {withLabel ? (watched ? "Watching" : "Watch") : null}
    </button>
  );
}

/** Stack of in-app notifications (order fills, price alerts). */
export function ToastHost() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="toast-host" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={clsx("toast", `toast-${toast.tone}`)} role="status">
          <span className="toast-icon" aria-hidden="true">
            {toast.tone === "gain" ? <CircleCheck size={18} /> : toast.tone === "loss" ? <CircleX size={18} /> : <BellRing size={18} />}
          </span>
          <span className="stack grow" style={{ gap: 2, minWidth: 0 }}>
            <strong>{toast.title}</strong>
            <span className="small muted">{toast.body}</span>
          </span>
          <button type="button" className="btn btn-icon btn-sm" onClick={() => dismissToast(toast.id)} aria-label="Dismiss notification">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
