// Shareable trade cards: the data for a closed trade (pure; unit-tested) and a
// canvas renderer for a glassy 1080×1080 PNG (browser only).
import { closedTrades } from "./biases";
import type { AppState } from "./types";

export type TradeCardData = {
  txId: string;
  symbol: string;
  thesisTitle: string | null;
  resultPct: number;
  resultDollars: number;
  holdDays: number;
  holdLabel: string;
  closedAt: string;
};

const DAY = 86_400_000;

export function holdLabel(ms: number): string {
  const days = ms / DAY;
  if (days < 1) {
    const hours = Math.max(1, Math.round(ms / 3_600_000));
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  const d = Math.round(days);
  if (d < 60) return `${d} day${d === 1 ? "" : "s"}`;
  const months = Math.round(d / 30.4);
  return `${months} month${months === 1 ? "" : "s"}`;
}

/** Card data for a sell in the ledger (null when the id isn't a sell with a realized result). */
export function tradeCardData(state: AppState, txId: string): TradeCardData | null {
  const closed = closedTrades(state.transactions).find((c) => c.tx.id === txId);
  if (!closed) return null;
  const { tx } = closed;
  if (tx.realizedGain === undefined) return null;
  const costBasis = tx.amount - tx.realizedGain;
  const resultPct = costBasis > 0 ? (tx.realizedGain / costBasis) * 100 : 0;
  const thesis = tx.thesisId ? state.theses.find((t) => t.id === tx.thesisId) : state.theses.find((t) => t.symbol.toUpperCase() === closed.symbol);
  return {
    txId,
    symbol: closed.symbol,
    thesisTitle: thesis?.title ?? null,
    resultPct,
    resultDollars: tx.realizedGain,
    holdDays: closed.holdMs / DAY,
    holdLabel: holdLabel(closed.holdMs),
    closedAt: tx.createdAt,
  };
}

export const CARD_SIZE = 1080;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else line = test;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(" ") !== lines.join(" ")) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

/** Draw the card. `logo` is the Sentia icon (optional; a text mark is drawn if missing). */
export function drawTradeCard(
  canvas: HTMLCanvasElement,
  data: TradeCardData,
  opts: { showDollars: boolean; logo?: HTMLImageElement | null },
) {
  const S = CARD_SIZE;
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const font = "'DM Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";
  const gain = data.resultPct >= 0;

  // Deep navy + violet aurora background.
  ctx.fillStyle = "#070a1c";
  ctx.fillRect(0, 0, S, S);
  const blob = (x: number, y: number, r: number, color: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(7,10,28,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  };
  blob(220, 160, 620, "rgba(124,58,237,0.55)");
  blob(940, 300, 520, "rgba(79,70,229,0.45)");
  blob(700, 1040, 640, gain ? "rgba(52,211,153,0.28)" : "rgba(251,113,133,0.26)");

  // Frosted glass panel.
  roundRect(ctx, 80, 80, S - 160, S - 160, 56);
  ctx.fillStyle = "rgba(20,24,52,0.55)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.stroke();
  const sheen = ctx.createLinearGradient(0, 80, 0, 420);
  sheen.addColorStop(0, "rgba(255,255,255,0.09)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  roundRect(ctx, 82, 82, S - 164, 340, 54);
  ctx.fillStyle = sheen;
  ctx.fill();

  // Brand.
  if (opts.logo && opts.logo.complete && opts.logo.naturalWidth > 0) {
    ctx.save();
    roundRect(ctx, 150, 150, 72, 72, 18);
    ctx.clip();
    ctx.drawImage(opts.logo, 150, 150, 72, 72);
    ctx.restore();
  } else {
    roundRect(ctx, 150, 150, 72, 72, 18);
    const g = ctx.createLinearGradient(150, 150, 222, 222);
    g.addColorStop(0, "#8b5cf6");
    g.addColorStop(1, "#4f46e5");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `700 44px ${font}`;
    ctx.textAlign = "center";
    ctx.fillText("S", 186, 202);
  }
  ctx.textAlign = "left";
  ctx.fillStyle = "#ecebf7";
  ctx.font = `700 44px ${font}`;
  ctx.fillText("Sentia", 244, 202);
  ctx.font = `500 26px ${font}`;
  ctx.fillStyle = "#b9b5d3";
  ctx.textAlign = "right";
  ctx.fillText("Paper trade · closed", S - 150, 198);

  // Symbol pill.
  ctx.textAlign = "left";
  ctx.font = `800 120px ${font}`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(data.symbol, 150, 400);

  // Thesis title.
  ctx.font = `500 36px ${font}`;
  ctx.fillStyle = "#c4b5fd";
  const thesis = data.thesisTitle ? `“${data.thesisTitle}”` : "No thesis linked";
  wrapLines(ctx, thesis, S - 300, 2).forEach((line, i) => ctx.fillText(line, 150, 470 + i * 48));

  // Result.
  ctx.font = `800 168px ${font}`;
  const resultText = `${gain ? "+" : "−"}${Math.abs(data.resultPct).toFixed(1)}%`;
  const rg = ctx.createLinearGradient(150, 600, 750, 760);
  rg.addColorStop(0, gain ? "#6ee7b7" : "#fda4af");
  rg.addColorStop(1, gain ? "#34d399" : "#fb7185");
  ctx.fillStyle = rg;
  ctx.fillText(resultText, 140, 750);

  ctx.font = `500 34px ${font}`;
  ctx.fillStyle = "#b9b5d3";
  const dollars = opts.showDollars
    ? `${data.resultDollars >= 0 ? "+" : "−"}$${Math.abs(data.resultDollars).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} realized`
    : "Realized result";
  ctx.fillText(dollars, 150, 810);

  // Footer chips.
  const chip = (x: number, label: string) => {
    ctx.font = `600 30px ${font}`;
    const w = ctx.measureText(label).width + 56;
    roundRect(ctx, x, 862, w, 64, 32);
    ctx.fillStyle = "rgba(124,58,237,0.28)";
    ctx.fill();
    ctx.strokeStyle = "rgba(196,181,253,0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#ecebf7";
    ctx.fillText(label, x + 28, 905);
    return x + w + 18;
  };
  const next = chip(150, `Held ${data.holdLabel}`);
  chip(next, new Date(data.closedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));

  ctx.font = `400 22px ${font}`;
  ctx.fillStyle = "#9c97bd";
  ctx.textAlign = "left";
  ctx.fillText("Simulated paper trade · educational only · not investment advice", 150, S - 112);
}
