"use client";

import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { Button, EmptyState, Field, Input, PageHeader, Panel, Textarea } from "@/components/ui";

export function ThesisView() {
  const { state, addThesisAction } = useApp();
  const [symbol, setSymbol] = useState("");
  const [title, setTitle] = useState("");
  const [rationale, setRationale] = useState("");
  const [risks, setRisks] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const sym = symbol.trim().toUpperCase();
    if (!/^[A-Z.\-]{1,12}$/.test(sym)) {
      setError("Enter a valid ticker.");
      return;
    }
    if (!title.trim() || !rationale.trim()) {
      setError("Title and rationale are required.");
      return;
    }
    const err = addThesisAction({
      symbol: sym,
      title: title.trim().slice(0, 100),
      rationale: rationale.trim().slice(0, 4000),
      risks: risks.trim().slice(0, 2000),
    });
    if (err) setError(err);
    else {
      setSymbol("");
      setTitle("");
      setRationale("");
      setRisks("");
    }
  }

  return (
    <div className="stack gap-lg animate-in">
      <PageHeader
        title="Investment theses"
        subtitle="Write the why while you are calm — revisit when markets are loud."
      />
      <Panel>
        {state.theses.length === 0 ? (
          <EmptyState
            title="No theses yet"
            body="Document why you bought to make better decisions under stress."
          />
        ) : (
          <ul className="stack gap-md">
            {state.theses.map((t) => (
              <li key={t.id} className="thesis-card">
                <div className="row between">
                  <strong>
                    {t.symbol} · {t.title}
                  </strong>
                  <span className="muted small">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p>{t.rationale}</p>
                {t.risks ? (
                  <p className="muted">
                    <strong>Risks:</strong> {t.risks}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel>
        <h2 className="section-title">New thesis</h2>
        <form className="form-grid" onSubmit={onSubmit}>
          <Field label="Symbol">
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              maxLength={12}
              placeholder="VTI"
              required
            />
          </Field>
          <Field label="Title">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="Broad US equity core"
              required
            />
          </Field>
          <Field label="Rationale">
            <Textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              maxLength={4000}
              rows={4}
              required
            />
          </Field>
          <Field label="Invalidation risks">
            <Textarea
              value={risks}
              onChange={(e) => setRisks(e.target.value)}
              maxLength={2000}
              rows={3}
            />
          </Field>
          {error ? <p className="form-error">{error}</p> : null}
          <Button type="submit">Save thesis</Button>
        </form>
      </Panel>
    </div>
  );
}
