"use client";

import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { formatCurrency } from "@/lib/format";
import { Button, EmptyState, Field, Input, PageHeader, Panel } from "@/components/ui";

export function GoalsView() {
  const { state, addGoalAction } = useApp();
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("50000");
  const [current, setCurrent] = useState("0");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const t = Number(target);
    const c = Number(current);
    if (!title.trim()) {
      setError("Give your goal a name.");
      return;
    }
    if (!Number.isFinite(t) || t <= 0 || !Number.isFinite(c) || c < 0) {
      setError("Enter valid amounts.");
      return;
    }
    const err = addGoalAction({
      title: title.trim().slice(0, 80),
      targetAmount: t,
      currentAmount: c,
    });
    if (err) setError(err);
    else {
      setTitle("");
      setCurrent("0");
    }
  }

  return (
    <div className="stack gap-lg animate-in">
      <PageHeader
        title="Goals"
        subtitle="Anchor portfolio decisions to a real-world outcome."
      />
      <Panel>
        {state.goals.length === 0 ? (
          <EmptyState
            title="No goals yet"
            body="Track progress toward retirement, a house, or a vacation."
          />
        ) : (
          <ul className="stack gap-md">
            {state.goals.map((g) => {
              const pct = Math.min(100, (g.currentAmount / g.targetAmount) * 100);
              return (
                <li key={g.id}>
                  <div className="row between">
                    <strong>{g.title}</strong>
                    <span className="muted">
                      {formatCurrency(g.currentAmount)} / {formatCurrency(g.targetAmount)}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill gold" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
      <Panel>
        <h2 className="section-title">New goal</h2>
        <form className="form-grid" onSubmit={onSubmit}>
          <Field label="Title">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="House down payment"
              required
            />
          </Field>
          <Field label="Target amount">
            <Input
              type="number"
              min="1"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              required
            />
          </Field>
          <Field label="Saved so far">
            <Input
              type="number"
              min="0"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </Field>
          {error ? <p className="form-error">{error}</p> : null}
          <Button type="submit">Save goal</Button>
        </form>
      </Panel>
    </div>
  );
}
