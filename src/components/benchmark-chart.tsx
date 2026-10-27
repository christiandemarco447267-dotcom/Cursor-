"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowRight, Trophy } from "lucide-react";
import { benchmarkStats, livePoint, seriesWithGhost, type BenchmarkPoint, type BenchmarkStats } from "@/lib/benchmark";
import { formatDate, formatPercent } from "@/lib/format";
import { useApp } from "@/lib/store";
import { Panel } from "./ui";

/** Benchmark stats for the current account, including an unsaved "now" point. */
export function useBenchmark(): BenchmarkStats | null {
  const { state, quotes } = useApp();
  return useMemo(() => {
    if (!state) return null;
    // eslint-disable-next-line react-hooks/purity -- the live point is "now" by design; recomputed on each quote update
    const now = Date.now();
    const live = livePoint(state, quotes, now);
    const stats = benchmarkStats(state.snapshots, state.transactions, live);
    // Merge the "If you never sold" ghost line (present only when there were sells).
    return { ...stats, points: seriesWithGhost(state.snapshots, state.transactions, quotes, live, now) };
  }, [state, quotes]);
}

export type SeriesKey = "portfolio" | "spy" | "ghost";
export type SeriesVisibility = Record<SeriesKey, boolean>;
const ALL_VISIBLE: SeriesVisibility = { portfolio: true, spy: true, ghost: true };

const DEFAULT_W = 640;
const H = 230;

/** Track an element's rendered width so the chart draws at true pixel size (crisp text on phones). */
function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(DEFAULT_W);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const next = Math.round(entries[0]?.contentRect.width ?? 0);
      if (next > 0) setWidth(next);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}
const PAD = { top: 14, right: 14, bottom: 26, left: 44 };

function formatTick(iso: string, spanMs: number): string {
  const d = new Date(iso);
  if (spanMs < 36 * 3_600_000) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return formatDate(iso);
}

export function BenchmarkChart({
  points,
  height = H,
  visible = ALL_VISIBLE,
  labels = { portfolio: "Portfolio", spy: "S&P 500 (SPY)" },
}: {
  points: BenchmarkPoint[];
  height?: number;
  visible?: SeriesVisibility;
  labels?: { portfolio: string; spy: string };
}) {
  const [wrapRef, W] = useWidth<HTMLDivElement>();
  const gradId = useId().replace(/:/g, "");
  const innerW = W - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;

  const t0 = new Date(points[0].t).getTime();
  const t1 = new Date(points[points.length - 1].t).getTime();
  const span = Math.max(1, t1 - t0);
  const hasGhost = visible.ghost && points.some((p) => p.ghost !== undefined);
  const values = points.flatMap((p) => [
    ...(visible.portfolio ? [p.portfolio] : []),
    ...(visible.spy ? [p.spy] : []),
    ...(hasGhost && p.ghost !== undefined ? [p.ghost] : []),
  ]);
  let min = Math.min(...values, 100);
  let max = Math.max(...values, 100);
  const pad = Math.max((max - min) * 0.12, 0.25);
  min -= pad;
  max += pad;
  const range = max - min || 1;

  const x = (t: string) => PAD.left + ((new Date(t).getTime() - t0) / span) * innerW;
  const y = (v: number) => PAD.top + (1 - (v - min) / range) * innerH;
  const line = (key: SeriesKey) =>
    points
      .filter((p) => p[key] !== undefined)
      .map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p[key] as number).toFixed(1)}`)
      .join(" ");
  const portfolioPath = line("portfolio");
  const areaPath = `${portfolioPath} L${x(points[points.length - 1].t).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${PAD.left},${(PAD.top + innerH).toFixed(1)} Z`;
  const ticks = [0, 1, 2, 3].map((i) => min + (range * i) / 3);
  const last = points[points.length - 1];

  return (
    <div ref={wrapRef} className="bench-wrap">
    <svg
      className="bench-chart"
      width={W}
      height={height}
      viewBox={`0 0 ${W} ${height}`}
      role="img"
      aria-label={`${labels.portfolio} index ${last.portfolio.toFixed(1)} versus ${labels.spy} index ${last.spy.toFixed(1)}${hasGhost && last.ghost !== undefined ? `, and ${last.ghost.toFixed(1)} if you never sold` : ""}, all starting at 100.`}
    >
      <defs>
        <linearGradient id={`fill-${gradId}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`stroke-${gradId}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className="bench-grid" />
          <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" className="bench-axis">
            {v.toFixed(1)}
          </text>
        </g>
      ))}
      <line x1={PAD.left} x2={W - PAD.right} y1={y(100)} y2={y(100)} className="bench-base" />
      {visible.portfolio ? <path d={areaPath} fill={`url(#fill-${gradId})`} /> : null}
      {visible.spy ? <path d={line("spy")} className="bench-spy" /> : null}
      {hasGhost ? <path d={line("ghost")} className="bench-ghost" /> : null}
      {visible.portfolio ? <path d={portfolioPath} className="bench-you" stroke={`url(#stroke-${gradId})`} /> : null}
      {visible.portfolio ? <circle cx={x(last.t)} cy={y(last.portfolio)} r={4} className="bench-dot" /> : null}
      {visible.spy ? <circle cx={x(last.t)} cy={y(last.spy)} r={3.5} className="bench-dot-spy" /> : null}
      <text x={PAD.left} y={height - 6} className="bench-axis">
        {formatTick(points[0].t, span)}
      </text>
      <text x={W - PAD.right} y={height - 6} textAnchor="end" className="bench-axis">
        {formatTick(last.t, span)}
      </text>
    </svg>
    </div>
  );
}

/** Toggleable legend: each entry shows/hides its line. */
export function Legend({
  visible,
  onToggle,
  showGhost,
  youLabel = "You",
}: {
  visible: SeriesVisibility;
  onToggle: (key: SeriesKey) => void;
  showGhost: boolean;
  youLabel?: string;
}) {
  const items: { key: SeriesKey; label: string; cls: string }[] = [
    { key: "portfolio", label: youLabel, cls: "legend-you" },
    { key: "spy", label: "S&P 500 (SPY)", cls: "legend-spy" },
    ...(showGhost ? [{ key: "ghost" as const, label: "If you never sold", cls: "legend-ghost" }] : []),
  ];
  return (
    <span className="row wrap gap-sm small muted" role="group" aria-label="Chart lines">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`legend-toggle${visible[item.key] ? "" : " off"}`}
          aria-pressed={visible[item.key]}
          onClick={() => onToggle(item.key)}
          title={visible[item.key] ? `Hide ${item.label}` : `Show ${item.label}`}
        >
          <span className={`legend-line ${item.cls}`} /> {item.label}
        </button>
      ))}
    </span>
  );
}

function tone(v: number): "gain" | "loss" | undefined {
  return v > 0.004 ? "gain" : v < -0.004 ? "loss" : undefined;
}

function MiniStat({ label, value, toneClass, hint }: { label: string; value: string; toneClass?: string; hint?: string }) {
  return (
    <div className="bench-stat stack" style={{ gap: 2 }}>
      <span className="eyebrow">{label}</span>
      <strong className={`value-lg ${toneClass ?? ""}`}>{value}</strong>
      {hint ? <span className="small dim">{hint}</span> : null}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="empty stack gap-sm" style={{ minHeight: 140, justifyContent: "center" }}>
      <strong>Tracking has started</strong>
      <span className="small">
        Sentia records your total value and SPY on every trade and every few minutes while the app is open. The chart
        fills in as prices update.
      </span>
    </div>
  );
}

/** Full "You vs. S&P 500" panel: chart + stats. */
export function BenchmarkPanel() {
  const stats = useBenchmark();
  const [visible, setVisible] = useState<SeriesVisibility>(ALL_VISIBLE);
  if (!stats) return null;
  const { points, winRate } = stats;
  const hasGhost = points.some((p) => p.ghost !== undefined);
  const ghostLast = hasGhost ? points[points.length - 1].ghost : undefined;
  const toggle = (key: SeriesKey) =>
    setVisible((v) => {
      const next = { ...v, [key]: !v[key] };
      // Always keep at least one line on screen.
      return next.portfolio || next.spy || (hasGhost && next.ghost) ? next : v;
    });
  const beat = stats.outperformancePct >= 0;

  return (
    <Panel strong className="stack gap-md">
      <div className="row between wrap gap-sm">
        <div className="stack" style={{ gap: 2 }}>
          <strong className="row gap-sm">
            <Trophy size={17} /> You vs. S&amp;P 500
          </strong>
          <span className="small muted">
            Both indexed to 100{stats.since ? ` since ${formatDate(stats.since)}` : ""}. Deposits and withdrawals are
            excluded from your return.
          </span>
        </div>
        <Legend visible={visible} onToggle={toggle} showGhost={hasGhost} />
      </div>

      {points.length >= 2 ? <BenchmarkChart points={points} visible={visible} /> : <EmptyChart />}
      {hasGhost && ghostLast !== undefined && points.length >= 2 ? (
        <span className="small dim">
          If you never sold: {formatPercent(ghostLast - 100, true)} vs. your {formatPercent(stats.totalReturnPct, true)}. Approximation —
          sold shares are valued from your own trade prices and current quotes, interpolated between them.
        </span>
      ) : null}

      <div className="bench-stats">
        <MiniStat label="Your return" value={formatPercent(stats.totalReturnPct, true)} toneClass={tone(stats.totalReturnPct)} />
        <MiniStat label="SPY return" value={formatPercent(stats.spyReturnPct, true)} toneClass={tone(stats.spyReturnPct)} />
        <MiniStat
          label="Outperformance"
          value={`${formatPercent(stats.outperformancePct, true).replace("%", "")} pts`}
          toneClass={tone(stats.outperformancePct)}
          hint={points.length >= 2 ? (beat ? "Ahead of the market" : "Behind the market") : undefined}
        />
        <MiniStat
          label="Max drawdown"
          value={stats.maxDrawdownPct > 0 ? `−${stats.maxDrawdownPct.toFixed(2)}%` : "0.00%"}
          toneClass={stats.maxDrawdownPct > 0 ? "loss" : undefined}
        />
        <MiniStat
          label="Win rate"
          value={winRate.percent === null ? "—" : `${winRate.percent.toFixed(0)}%`}
          hint={winRate.closed ? `${winRate.wins} of ${winRate.closed} closed trades` : "No closed trades yet"}
        />
      </div>
    </Panel>
  );
}

/** Compact dashboard card linking to the full panel on Portfolio. */
export function BenchmarkCard() {
  const stats = useBenchmark();
  if (!stats) return null;
  const { points } = stats;
  return (
    <Link href="/app/portfolio" className="panel holo stack gap-sm" aria-label="You vs. S&P 500 — open Portfolio">
      <div className="row between wrap gap-sm">
        <strong className="row gap-sm">
          <Trophy size={17} /> You vs. S&amp;P 500
        </strong>
        <span className="row gap-sm small muted">
          <span className={tone(stats.totalReturnPct)}>You {formatPercent(stats.totalReturnPct, true)}</span>·
          <span className={tone(stats.spyReturnPct)}>SPY {formatPercent(stats.spyReturnPct, true)}</span>
          <ArrowRight size={15} />
        </span>
      </div>
      {points.length >= 2 ? (
        <BenchmarkChart points={points} height={150} visible={{ portfolio: true, spy: true, ghost: false }} />
      ) : (
        <span className="small muted">Tracking started. The chart fills in as prices update.</span>
      )}
    </Link>
  );
}
