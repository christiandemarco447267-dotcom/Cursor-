"use client";

import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { useApp } from "@/lib/store";
import { parseAmount } from "@/lib/validation";
import { EmptyState, Loading, Panel, PageHeader, ProgressBar } from "./ui";

export function GoalsView() {
  const { ready, state, actions } = useApp();
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState("");

  if (!ready || !state) return <Loading />;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const targetAmount = parseAmount(target);
    const currentAmount = parseAmount(current) ?? 0;
    if (!title.trim()) return setError("Give your goal a title.");
    if (targetAmount === null || targetAmount <= 0) return setError("Enter a positive target amount.");
    if (currentAmount < 0) return setError("Saved amount can't be negative.");

    actions.addGoal({ title, targetAmount, currentAmount, deadline: deadline || undefined });
    setTitle("");
    setTarget("");
    setCurrent("");
    setDeadline("");
  };

  return (
    <div className="stack gap-lg animate-in">
      <PageHeader title="Goals" subtitle="Set savings targets and track your progress toward them." />

      {state.goals.length === 0 ? (
        <EmptyState title="No goals yet" hint="Add your first goal below to start tracking progress." />
      ) : (
        <div className="stack gap-md">
          {state.goals.map((goal) => {
            const percent = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
            return (
              <Panel key={goal.id} className="stack gap-sm">
                <div className="row between wrap gap-sm">
                  <strong>{goal.title}</strong>
                  <span className="muted small">
                    {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                  </span>
                </div>
                <ProgressBar percent={percent} />
                <div className="row between wrap gap-sm">
                  <span className="small dim">
                    {Math.min(100, Math.round(percent))}% funded{goal.deadline ? ` · by ${formatDate(goal.deadline)}` : ""}
                  </span>
                  <div className="row gap-sm">
                    <button className="btn btn-sm" onClick={() => actions.contributeToGoal(goal.id, 100)} aria-label="Add $100">
                      <Plus size={14} /> $100
                    </button>
                    <button className="btn btn-sm" onClick={() => actions.contributeToGoal(goal.id, -100)} aria-label="Remove $100">
                      <Minus size={14} /> $100
                    </button>
                    <button className="btn btn-sm btn-danger btn-icon" onClick={() => actions.removeGoal(goal.id)} aria-label="Delete goal">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      <Panel strong className="stack gap-md">
        <strong>New goal</strong>
        <form className="stack gap-md" onSubmit={submit}>
          <div className="field">
            <label htmlFor="goal-title">Title</label>
            <input id="goal-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Emergency fund" />
          </div>
          <div className="grid grid-3">
            <div className="field">
              <label htmlFor="goal-target">Target amount</label>
              <input id="goal-target" className="input" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="10000" />
            </div>
            <div className="field">
              <label htmlFor="goal-current">Saved so far</label>
              <input id="goal-current" className="input" inputMode="decimal" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="0" />
            </div>
            <div className="field">
              <label htmlFor="goal-deadline">Deadline (optional)</label>
              <input id="goal-deadline" className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          {error ? <span className="form-error">{error}</span> : null}
          <button type="submit" className="btn btn-primary" style={{ width: "fit-content" }}>
            Add goal (+30 XP)
          </button>
        </form>
      </Panel>
    </div>
  );
}
