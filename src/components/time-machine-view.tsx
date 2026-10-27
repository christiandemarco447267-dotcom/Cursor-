"use client";

import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, FastForward, History, Info, RotateCcw, SkipForward, StepForward, TriangleAlert, Trophy } from "lucide-react";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { nameForSymbol } from "@/lib/market";
import { useApp } from "@/lib/store";
import {
  bookValue,
  closeOn,
  equityCurve,
  getScenario,
  listScenarios,
  REPLAY_START_CASH,
  replayBook,
  replayChartPoints,
  reportCard,
  scenarioSymbols,
  TIME_MACHINE_FETCHED,
  TIME_MACHINE_SOURCE,
  TRADING_DAYS_PER_WEEK,
  type FeedbackTone,
} from "@/lib/time-machine";
import { parseAmount } from "@/lib/validation";
import { BenchmarkChart } from "./benchmark-chart";
import { Gauge } from "./discipline-card";
import { EmptyState, Loading, Panel, PageHeader } from "./ui";

const SCENARIOS = listScenarios();

const TONE_ICON: Record<FeedbackTone, React.ReactNode> = {
  good: <CheckCircle2 size={16} className="gain" />,
  watch: <TriangleAlert size={16} style={{ color: "#fbbf24" }} />,
  info: <Info size={16} className="muted" />,
};

function fmtDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function TimeMachineView() {
  const { ready, state, actions } = useApp();
  const [picked, setPicked] = useState(SCENARIOS[0]?.id ?? "");
  const [pickedSymbol, setSymbol] = useState("SPY");
  const [shares, setShares] = useState("");
  const [error, setError] = useState("");

  const session = state?.replay ?? null;
  const scenario = session ? getScenario(session.scenarioId) : null;
  const curve = useMemo(() => (session && scenario ? equityCurve(session, scenario) : []), [session, scenario]);
  const card = useMemo(() => (session?.finishedAt && scenario ? reportCard(session, scenario) : null), [session, scenario]);

  if (!ready || !state) return <Loading />;

  const header = (
    <PageHeader
      title="Time Machine"
      subtitle="Replay real market history in a separate practice account. Your main portfolio is never touched."
    />
  );

  if (!session || !scenario) {
    return (
      <div className="stack gap-lg animate-in">
        {header}
        <div className="grid grid-3">
          {SCENARIOS.map((s) => (
            <button key={s.id} type="button" className="panel holo scenario-card stack gap-sm" aria-pressed={picked === s.id} onClick={() => setPicked(s.id)}>
              <span className="eyebrow">{s.period}</span>
              <strong style={{ fontSize: "1.15rem" }}>{s.title}</strong>
              <span className="small muted">{s.blurb}</span>
              <span className="small dim">
                {s.dates.length} trading days · {scenarioSymbols(s).join(", ")}
              </span>
            </button>
          ))}
        </div>
        <Panel strong className="row between wrap gap-md">
          <span className="stack" style={{ gap: 2 }}>
            <strong>Start with {formatCurrency(REPLAY_START_CASH)} of practice cash</strong>
            <span className="small muted">{SCENARIOS.find((s) => s.id === picked)?.lesson}</span>
          </span>
          <button type="button" className="btn btn-primary" onClick={() => actions.startReplay(picked)} disabled={!picked}>
            <History size={16} /> Start replay
          </button>
        </Panel>
        <PastResults />
        <SourceNote />
      </div>
    );
  }

  const day = session.dayIndex;
  const lastDay = scenario.dates.length - 1;
  const book = replayBook(session, scenario);
  const value = bookValue(book, scenario, day);
  const points = replayChartPoints(curve, session.startCash);
  const symbols = scenarioSymbols(scenario);
  // The picker survives across scenarios; fall back when the last pick (e.g. GME)
  // isn't traded in this one, so the select, price and trade always agree.
  const symbol = symbols.includes(pickedSymbol) ? pickedSymbol : symbols.includes("SPY") ? "SPY" : (symbols[0] ?? "SPY");
  const price = closeOn(scenario, symbol, day);
  const sharesNum = parseAmount(shares);
  const finished = Boolean(session.finishedAt);
  const lastPoint = points[points.length - 1];

  const trade = (side: "buy" | "sell") => {
    setError("");
    if (sharesNum === null || sharesNum <= 0) return setError("Enter a positive number of shares.");
    try {
      actions.replayTrade({ side, symbol, shares: sharesNum });
      setShares("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trade failed.");
    }
  };
  const maxBuy = price ? Math.floor(book.cash / price) : 0;
  const held = book.positions.find((p) => p.symbol === symbol);

  return (
    <div className="stack gap-lg animate-in">
      {header}

      <Panel strong className="stack gap-md">
        <div className="row between wrap gap-md">
          <div className="stack" style={{ gap: 2 }}>
            <span className="eyebrow">
              {scenario.title} · day {day + 1} of {lastDay + 1}
            </span>
            <span className="tm-day">{fmtDate(scenario.dates[day])}</span>
          </div>
          <div className="row wrap gap-sm">
            <span className="pill">Value {formatCurrency(value)}</span>
            <span className="pill">Cash {formatCurrency(book.cash)}</span>
            {lastPoint ? (
              <span className={`pill ${lastPoint.portfolio >= lastPoint.spy ? "pill-primary" : ""}`}>
                You {formatPercent(lastPoint.portfolio - 100, true)} · SPY {formatPercent(lastPoint.spy - 100, true)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="row wrap gap-sm">
          <button type="button" className="btn btn-sm" disabled={finished} onClick={() => actions.stepReplay(1)}>
            <StepForward size={15} /> +1 day
          </button>
          <button type="button" className="btn btn-sm" disabled={finished} onClick={() => actions.stepReplay(TRADING_DAYS_PER_WEEK)}>
            <FastForward size={15} /> +1 week
          </button>
          <button type="button" className="btn btn-sm" disabled={finished} onClick={() => actions.stepReplay("end")}>
            <SkipForward size={15} /> To the end
          </button>
          <span className="grow" />
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={() => {
              if (finished || confirm("Abandon this replay? Its progress will be lost.")) {
                actions.endReplay();
                // A fresh scenario starts from a clean ticket.
                setSymbol("SPY");
                setShares("");
                setError("");
              }
            }}
          >
            <RotateCcw size={15} /> {finished ? "New scenario" : "Abandon"}
          </button>
        </div>
        {points.length >= 2 ? (
          <BenchmarkChart points={points} labels={{ portfolio: "Replay account", spy: "S&P 500 (SPY)" }} />
        ) : (
          <EmptyState title="Day one" hint="Buy something at today's close, then step forward to watch history unfold." />
        )}
        <span className="row wrap gap-sm small muted">
          <span className="row gap-sm" style={{ gap: 6 }}>
            <span className="legend-line legend-you" /> You
          </span>
          <span className="row gap-sm" style={{ gap: 6 }}>
            <span className="legend-line legend-spy" /> SPY
          </span>
          · both indexed to 100 on {fmtDate(scenario.dates[0])}
        </span>
      </Panel>

      {card ? <ReportCardPanel card={card} /> : null}

      <div className="grid grid-2">
        <Panel className="stack gap-md">
          <strong>Trade at today&apos;s close</strong>
          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="tm-symbol">Symbol</label>
              <select id="tm-symbol" className="select" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
                {symbols.map((s) => (
                  <option key={s} value={s}>
                    {s} — {formatCurrency(closeOn(scenario, s, day) ?? 0)}
                  </option>
                ))}
              </select>
              <span className="small dim">{nameForSymbol(symbol) === symbol ? "" : nameForSymbol(symbol)}</span>
            </div>
            <div className="field">
              <label htmlFor="tm-shares">Shares</label>
              <input id="tm-shares" className="input" inputMode="decimal" value={shares} onChange={(e) => setShares(e.target.value)} placeholder="0" disabled={finished} />
              <span className="small dim">
                Max buy {formatNumber(maxBuy)}
                {held ? ` · you hold ${formatNumber(held.shares)}` : ""}
              </span>
            </div>
          </div>
          {sharesNum && price ? (
            <div className="row between small">
              <span className="muted">Estimated</span>
              <strong>{formatCurrency(sharesNum * price)}</strong>
            </div>
          ) : null}
          {error ? (
            <span className="form-error" role="alert">
              {error}
            </span>
          ) : null}
          <div className="row gap-sm">
            <button type="button" className="btn btn-primary grow" disabled={finished} onClick={() => trade("buy")}>
              <ArrowUpRight size={15} /> Buy
            </button>
            <button type="button" className="btn grow" disabled={finished || !held} onClick={() => trade("sell")}>
              <ArrowDownLeft size={15} /> Sell
            </button>
          </div>
        </Panel>

        <Panel className="stack gap-md">
          <strong>Replay positions</strong>
          {book.positions.length === 0 ? (
            <EmptyState title="All cash" hint="Practice money only. Nothing here touches your main account." />
          ) : (
            <div className="list">
              {book.positions.map((p) => {
                const px = closeOn(scenario, p.symbol, day) ?? p.avgCost;
                const gain = (px - p.avgCost) * p.shares;
                return (
                  <div key={p.symbol} className="list-row">
                    <span className="sym-badge">{p.symbol.slice(0, 4)}</span>
                    <div className="grow stack" style={{ gap: 2 }}>
                      <strong>
                        {formatNumber(p.shares)} @ {formatCurrency(p.avgCost)}
                      </strong>
                      <span className="small dim">Now {formatCurrency(px)}</span>
                    </div>
                    <span className={gain >= 0 ? "gain" : "loss"}>{formatCurrency(p.shares * px)}</span>
                  </div>
                );
              })}
            </div>
          )}
          <span className="small dim">{session.trades.length} trade{session.trades.length === 1 ? "" : "s"} so far · realized {formatCurrency(book.realized)}</span>
        </Panel>
      </div>
      <SourceNote />
    </div>
  );
}

function ReportCardPanel({ card }: { card: ReturnType<typeof reportCard> }) {
  return (
    <Panel strong className="holo stack gap-md">
      <div className="row between wrap gap-sm">
        <strong className="row gap-sm">
          <Trophy size={18} /> Report card
        </strong>
        <span className={`pill ${card.beatSpy ? "pill-primary" : ""}`}>{card.beatSpy ? "Beat the S&P 500" : "Trailed the S&P 500"}</span>
      </div>
      <div className="row wrap gap-lg" style={{ alignItems: "center" }}>
        <Gauge score={card.processScore} label="Replay discipline" />
        <div className="bench-stats grow" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <Mini label="Your return" value={formatPercent(card.returnPct, true)} tone={card.returnPct >= 0 ? "gain" : "loss"} />
          <Mini label="SPY return" value={formatPercent(card.spyReturnPct, true)} tone={card.spyReturnPct >= 0 ? "gain" : "loss"} />
          <Mini label="Your max drawdown" value={`−${card.maxDrawdownPct.toFixed(1)}%`} tone="loss" />
          <Mini label="SPY max drawdown" value={`−${card.spyMaxDrawdownPct.toFixed(1)}%`} tone="loss" />
        </div>
      </div>
      <div className="stack gap-sm">
        {card.feedback.map((f) => (
          <div key={f.title} className="row gap-sm" style={{ alignItems: "flex-start" }}>
            <span style={{ marginTop: 3 }}>{TONE_ICON[f.tone]}</span>
            <span className="small">
              <strong>{f.title}.</strong> <span className="muted">{f.body}</span>
            </span>
          </div>
        ))}
      </div>
      <span className="small dim">Practice feedback on your process. Past markets don&apos;t predict future ones; not investment advice.</span>
    </Panel>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "gain" | "loss" }) {
  return (
    <div className="bench-stat stack" style={{ gap: 2 }}>
      <span className="eyebrow">{label}</span>
      <strong className={`value-lg ${tone ?? ""}`}>{value}</strong>
    </div>
  );
}

function PastResults() {
  const { state } = useApp();
  const history = [...(state?.replayHistory ?? [])].reverse().slice(0, 6);
  if (!history.length) return null;
  return (
    <Panel className="stack gap-sm">
      <strong>Past replays</strong>
      <div className="list">
        {history.map((h) => (
          <div key={h.finishedAt} className="list-row" style={{ padding: "10px 0" }}>
            <span className="grow">{getScenario(h.scenarioId)?.title ?? h.scenarioId}</span>
            <span className={h.returnPct >= 0 ? "gain" : "loss"}>{formatPercent(h.returnPct, true)}</span>
            <span className="small dim">vs SPY {formatPercent(h.spyReturnPct, true)}</span>
            {h.returnPct > h.spyReturnPct ? <Trophy size={15} className="gain" aria-label="Beat SPY" /> : null}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function SourceNote() {
  return (
    <p className="disclaimer">
      Real daily closing prices (split-adjusted, dividends excluded) from {TIME_MACHINE_SOURCE.split(" (")[0]}, bundled with the app (fetched{" "}
      {TIME_MACHINE_FETCHED}). Trades fill at each day&apos;s close with no fees or slippage. Educational practice only — not investment advice.
    </p>
  );
}
