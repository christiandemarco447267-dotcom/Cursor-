"use client";

import { useMemo, useState } from "react";
import { Radar, Smile } from "lucide-react";
import { BIAS_INFO, BIAS_KEYS } from "@/lib/biases";
import { formatDate, formatSignedCurrency } from "@/lib/format";
import { moodStats, type MoodBasis } from "@/lib/moods";
import { useApp } from "@/lib/store";
import { useDiscipline } from "./discipline-card";
import { EmptyState, Panel } from "./ui";

export function BiasRadarPanel() {
  const result = useDiscipline();
  if (!result) return null;
  const { bias } = result;
  const d = bias.disposition;
  return (
    <Panel className="stack gap-md">
      <div className="row between wrap gap-sm">
        <strong className="row gap-sm">
          <Radar size={18} /> Bias Radar
        </strong>
        <span className="small muted">
          Last {bias.windowDays} days · {bias.trades} trade{bias.trades === 1 ? "" : "s"} reviewed
        </span>
      </div>
      <div className="bias-grid">
        {BIAS_KEYS.map((key) => (
          <div key={key} className={`bias-tile${bias.counts[key] ? " hit" : ""}`} title={BIAS_INFO[key].tip}>
            <span className="bias-count">{bias.counts[key]}</span>
            <strong className="small">{BIAS_INFO[key].label}</strong>
            <span className="small dim">{BIAS_INFO[key].short}</span>
          </div>
        ))}
      </div>
      {d.winners + d.losers > 0 ? (
        <span className="small muted">
          Average hold: winners {d.avgWinnerHoldDays === null ? "—" : `${d.avgWinnerHoldDays.toFixed(1)} days`} · losers{" "}
          {d.avgLoserHoldDays === null ? "—" : `${d.avgLoserHoldDays.toFixed(1)} days`}
          {d.flagged ? " — you tend to let losers run longer than winners." : "."}
        </span>
      ) : null}
      {bias.events.length ? (
        <div className="list">
          {bias.events.slice(0, 6).map((e) => (
            <div key={`${e.bias}-${e.txId}`} className="list-row" style={{ padding: "10px 0" }}>
              <span className="pill pill-accent pill-compact" style={{ minWidth: 120, justifyContent: "center" }}>
                {BIAS_INFO[e.bias].label}
              </span>
              <span className="grow small">{e.detail}</span>
              <span className="small dim">{formatDate(e.at)}</span>
            </div>
          ))}
        </div>
      ) : (
        <span className="small gain">No bias patterns flagged recently. Calm, deliberate trading.</span>
      )}
      <span className="small dim">
        Heuristics, not judgments: FOMO = buying on a ≥3% up day or at a fresh recent high; revenge = a buy within 24h of a
        realized loss; panic = selling at a loss on a ≤−3% day; overtrading = 6+ trades in 24h.
      </span>
    </Panel>
  );
}

export function MoodPanel() {
  const { state } = useApp();
  const [basis, setBasis] = useState<MoodBasis>("entry");
  const stats = useMemo(() => (state ? moodStats(state.transactions, basis) : []), [state, basis]);
  if (!state) return null;
  const tagged = stats.reduce((s, m) => s + m.trades, 0);
  return (
    <Panel className="stack gap-md">
      <div className="row between wrap gap-sm">
        <strong className="row gap-sm">
          <Smile size={18} /> Results by mood
        </strong>
        <div className="segmented" role="group" aria-label="Attribute closed trades by">
          {(["entry", "exit"] as const).map((b) => (
            <button key={b} type="button" className={basis === b ? "active" : ""} aria-pressed={basis === b} onClick={() => setBasis(b)}>
              Mood at {b}
            </button>
          ))}
        </div>
      </div>
      {tagged === 0 ? (
        <EmptyState title="No mood tags yet" hint="Pick how you feel when you place a trade. Patterns appear here once trades close." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mood</th>
                <th>Trades</th>
                <th>Closed</th>
                <th>Win rate</th>
                <th style={{ textAlign: "right" }}>Realized P/L</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((m) => (
                <tr key={m.mood}>
                  <td>
                    <span aria-hidden="true">{m.emoji}</span> {m.label}
                  </td>
                  <td>{m.trades}</td>
                  <td>{m.closed}</td>
                  <td>{m.winRate === null ? "—" : `${m.winRate.toFixed(0)}%`}</td>
                  <td style={{ textAlign: "right" }} className={m.realized > 0 ? "gain" : m.realized < 0 ? "loss" : ""}>
                    {m.closed ? formatSignedCurrency(m.realized) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
