"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CheckCircle2, HeartPulse, Info, NotebookPen, TriangleAlert } from "lucide-react";
import { buildInsights, type InsightTone } from "@/lib/insights";
import { useApp } from "@/lib/store";
import { Loading, Panel, PageHeader } from "./ui";

const TONE_ICON: Record<InsightTone, React.ReactNode> = {
  good: <CheckCircle2 size={18} />,
  watch: <TriangleAlert size={18} />,
  info: <Info size={18} />,
};

const TONE_CLASS: Record<InsightTone, string> = {
  good: "pill-primary",
  watch: "pill-accent",
  info: "",
};

export function InsightsView() {
  const { ready, state, summary } = useApp();
  const insights = useMemo(() => (state && summary ? buildInsights(state, summary) : []), [state, summary]);

  if (!ready || !state || !summary) return <Loading />;

  return (
    <div className="stack gap-lg animate-in">
      <PageHeader title="Insights" subtitle="Rule-based coaching that stays consistent with your health grade." />

      <div className="grid grid-2">
        {insights.map((insight) => (
          <Panel key={insight.id} className="stack gap-sm">
            <span className={`pill ${TONE_CLASS[insight.tone]}`} style={{ width: "fit-content" }}>
              {TONE_ICON[insight.tone]} {insight.title}
            </span>
            <p className="muted small">{insight.body}</p>
          </Panel>
        ))}
      </div>

      <div className="grid grid-2">
        <Link href="/app/thesis" className="panel row gap-sm between">
          <span className="row gap-sm">
            <NotebookPen size={18} /> <strong>Write a thesis</strong>
          </span>
          <span className="small muted">Document why you hold each position</span>
        </Link>
        <Link href="/app/check-in" className="panel row gap-sm between">
          <span className="row gap-sm">
            <HeartPulse size={18} /> <strong>Log a check-in</strong>
          </span>
          <span className="small muted">Notice emotions before acting</span>
        </Link>
      </div>
    </div>
  );
}
