"use client";

import { useState } from "react";
import { Check, ChevronDown, Clock } from "lucide-react";
import { LESSONS, lessonProgressPercent } from "@/lib/lessons";
import { useApp } from "@/lib/store";
import { Loading, Panel, PageHeader, ProgressBar } from "./ui";

export function LearnView() {
  const { ready, state, actions } = useApp();
  const [openId, setOpenId] = useState<string | null>(null);

  if (!ready || !state) return <Loading />;

  const completed = new Set(state.lessons.map((l) => l.lessonId));
  const percent = lessonProgressPercent([...completed]);

  return (
    <div className="stack gap-lg animate-in">
      <PageHeader title="Learn" subtitle="Short, practical lessons on building a durable investing process." />

      <Panel className="stack gap-sm">
        <div className="row between">
          <strong>Curriculum progress</strong>
          <span className="small muted">{percent}%</span>
        </div>
        <ProgressBar percent={percent} />
      </Panel>

      <div className="stack gap-md">
        {LESSONS.map((lesson) => {
          const isOpen = openId === lesson.id;
          const isDone = completed.has(lesson.id);
          return (
            <Panel key={lesson.id} className="stack gap-sm">
              <button
                className="row between"
                style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", textAlign: "left", padding: 0 }}
                onClick={() => setOpenId(isOpen ? null : lesson.id)}
                aria-expanded={isOpen}
              >
                <span className="stack" style={{ gap: 2 }}>
                  <strong>
                    {isDone ? "✓ " : ""}
                    {lesson.title}
                  </strong>
                  <span className="small muted">{lesson.summary}</span>
                </span>
                <span className="row gap-sm small dim">
                  <Clock size={14} /> {lesson.minutes}m <ChevronDown size={16} style={{ transform: isOpen ? "rotate(180deg)" : "none" }} />
                </span>
              </button>

              {isOpen ? (
                <div className="stack gap-sm" style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                  {lesson.body.map((paragraph, i) => (
                    <p key={i} className="muted small">
                      {paragraph}
                    </p>
                  ))}
                  {isDone ? (
                    <span className="form-ok row gap-sm">
                      <Check size={15} /> Completed
                    </span>
                  ) : (
                    <button className="btn btn-primary btn-sm" style={{ width: "fit-content" }} onClick={() => actions.completeLesson(lesson.id)}>
                      Mark complete (+35 XP)
                    </button>
                  )}
                </div>
              ) : null}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
