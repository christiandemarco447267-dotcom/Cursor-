"use client";

import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { LESSONS, lessonProgressPercent } from "@/lib/lessons";
import { Button, PageHeader, Panel } from "@/components/ui";

export function LearnView() {
  const { state, completeLessonAction } = useApp();
  const completed = new Set(
    state.lessons.filter((l) => l.completed).map((l) => l.lessonId),
  );
  const [openId, setOpenId] = useState<string | null>(LESSONS[0]?.id ?? null);
  const pct = lessonProgressPercent(completed);

  return (
    <div className="stack gap-lg animate-in">
      <PageHeader
        title="Learn"
        subtitle="Short lessons that reinforce process — not stock tips."
      />
      <Panel>
        <div className="row between">
          <strong>Curriculum progress</strong>
          <span className="pill blue">{pct}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </Panel>
      <div className="stack gap-md">
        {LESSONS.map((lesson) => {
          const done = completed.has(lesson.id);
          const open = openId === lesson.id;
          return (
            <Panel key={lesson.id}>
              <button
                type="button"
                className="lesson-toggle"
                onClick={() => setOpenId(open ? null : lesson.id)}
              >
                <span>
                  <strong>{lesson.title}</strong>
                  <span className="muted block">
                    {lesson.summary} · {lesson.minutes} min
                  </span>
                </span>
                <span className={done ? "pill blue" : "pill"}>{done ? "Done" : "Open"}</span>
              </button>
              {open ? (
                <div className="lesson-body">
                  {lesson.body.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                  {!done ? (
                    <Button onClick={() => completeLessonAction(lesson.id)}>
                      Mark complete (+XP)
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
