"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Share2, X } from "lucide-react";
import { assetPath } from "@/lib/asset";
import { drawTradeCard, tradeCardData } from "@/lib/share-card";
import { useApp } from "@/lib/store";

/** Button that opens the share-card dialog for a closed trade (a ledger sell). */
export function ShareTradeButton({ txId, symbol }: { txId: string; symbol?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-sm btn-icon" onClick={() => setOpen(true)} aria-label={`Share ${symbol ?? "trade"} result card`} title="Share card">
        <Share2 size={14} />
      </button>
      {open ? <ShareCardDialog txId={txId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

export function ShareCardDialog({ txId, onClose }: { txId: string; onClose: () => void }) {
  const { state } = useApp();
  const data = useMemo(() => (state ? tradeCardData(state, txId) : null), [state, txId]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showDollars, setShowDollars] = useState(false);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [message, setMessage] = useState("");
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(() => {
    const img = new Image();
    img.onload = () => setLogo(img);
    img.src = assetPath("/icon.png");
  }, []);

  useEffect(() => {
    if (canvasRef.current && data) drawTradeCard(canvasRef.current, data, { showDollars, logo });
  }, [data, showDollars, logo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fileName = data ? `sentia-${data.symbol.toLowerCase()}-trade.png` : "sentia-trade.png";

  const download = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await canvasBlob(canvas);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Card downloaded.");
  };

  const share = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const blob = await canvasBlob(canvas);
    if (!blob) return;
    const file = new File([blob], fileName, { type: "image/png" });
    const payload: ShareData = { title: `${data.symbol} paper trade`, text: `My ${data.symbol} paper trade on Sentia` };
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ ...payload, files: [file] });
      else await navigator.share(payload);
    } catch {
      // User cancelled or sharing failed: nothing to do.
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal stack gap-md" role="dialog" aria-modal="true" aria-label="Share trade card" style={{ maxWidth: 520 }}>
        <div className="row between">
          <strong>Share your trade</strong>
          <button type="button" className="btn btn-icon btn-sm" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        {data ? (
          <>
            <canvas ref={canvasRef} className="share-canvas" width={1080} height={1080} aria-label={`${data.symbol} trade card: ${data.resultPct.toFixed(1)}%, held ${data.holdLabel}`} />
            <div className="switch-row">
              <span className="small">Show dollar amount</span>
              <button type="button" role="switch" aria-checked={showDollars} className="switch" onClick={() => setShowDollars((v) => !v)} aria-label="Show dollar amount" />
            </div>
            <div className="row wrap gap-sm">
              <button type="button" className="btn btn-primary" onClick={download}>
                <Download size={16} /> Download PNG
              </button>
              {canShare ? (
                <button type="button" className="btn" onClick={share}>
                  <Share2 size={16} /> Share
                </button>
              ) : null}
            </div>
            {message ? <span className="form-ok small">{message}</span> : null}
            <span className="small dim">Dollar amounts are hidden by default. Simulated trade; not investment advice.</span>
          </>
        ) : (
          <span className="small muted">This trade can&apos;t be turned into a card.</span>
        )}
      </div>
    </div>
  );
}
