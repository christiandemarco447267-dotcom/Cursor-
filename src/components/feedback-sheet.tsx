"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, Mail, MessageSquarePlus, Send, X } from "lucide-react";
import { track } from "@/lib/analytics";
import {
  buildFeedbackContext,
  FEEDBACK_KINDS,
  FEEDBACK_MAX,
  feedbackApiAvailable,
  githubIssueLink,
  mailtoLink,
  sendFeedback,
  validateFeedbackInput,
  type FeedbackInput,
  type FeedbackKind,
} from "@/lib/feedback";
import { priceSourceOf } from "@/lib/market";
import { useApp } from "@/lib/store";

/** "Feedback" button (sidebar + mobile menu) that opens the feedback sheet. */
export function FeedbackButton({ className, onOpen }: { className?: string; onOpen?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={clsx("btn btn-sm feedback-btn", className)}
        onClick={() => {
          onOpen?.();
          setOpen(true);
        }}
        aria-haspopup="dialog"
      >
        <MessageSquarePlus size={15} /> Feedback
      </button>
      {/* Portal: the mobile drawer becomes inert when it closes, so the sheet must live outside it. */}
      {open ? createPortal(<FeedbackSheet onClose={() => setOpen(false)} />, document.body) : null}
    </>
  );
}

export function FeedbackSheet({ onClose }: { onClose: () => void }) {
  const { market, summary } = useApp();
  const pathname = usePathname();
  const [type, setType] = useState<FeedbackKind>("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [attachContext, setAttachContext] = useState(true);
  const [includePortfolio, setIncludePortfolio] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLTextAreaElement>(null);
  const online = feedbackApiAvailable();

  useEffect(() => {
    const returnTo = document.activeElement as HTMLElement | null;
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const els = dialogRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), textarea, input, [tabindex='0']");
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      returnTo?.focus?.();
    };
  }, [onClose]);

  const input = (): FeedbackInput => ({
    type,
    message,
    email: email.trim() || undefined,
    website,
    context: attachContext
      ? buildFeedbackContext({
          page: pathname,
          viewport: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "",
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
          dataSource: priceSourceOf(market),
          includePortfolio,
          summary,
        })
      : undefined,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = input();
    const invalid = validateFeedbackInput(payload);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError("");
    if (!online) return; // the fallback links below are the way to send
    setStatus("sending");
    try {
      await sendFeedback(payload);
      track("feedback_sent");
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Couldn't send feedback.");
    }
  };

  const payload = input();
  const mailto = mailtoLink(payload);
  const valid = validateFeedbackInput(payload) === null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} className="modal sheet stack gap-md" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
        <div className="row between">
          <h2 id="feedback-title" style={{ fontSize: "1.3rem" }}>
            Send feedback
          </h2>
          <button type="button" className="btn btn-icon btn-sm" onClick={onClose} aria-label="Close feedback">
            <X size={16} />
          </button>
        </div>

        {status === "sent" ? (
          <div className="stack gap-md" role="status">
            <p className="form-ok">Thanks — your feedback was sent. It really helps.</p>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form className="stack gap-md" onSubmit={submit} noValidate>
            <div className="segmented" role="group" aria-label="Feedback type">
              {FEEDBACK_KINDS.map((k) => (
                <button key={k.key} type="button" className={type === k.key ? "active" : ""} aria-pressed={type === k.key} onClick={() => setType(k.key)}>
                  <span aria-hidden="true">{k.emoji}</span> {k.label}
                </button>
              ))}
            </div>
            <div className="field">
              <label htmlFor="fb-message">{type === "bug" ? "What went wrong?" : type === "idea" ? "What would make Sentia better?" : "What did you like?"}</label>
              <textarea
                id="fb-message"
                ref={firstRef}
                className="input"
                rows={5}
                maxLength={FEEDBACK_MAX}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={type === "bug" ? "What you did, what you expected, what happened…" : "Tell us in a sentence or two…"}
              />
              <span className="small dim" style={{ textAlign: "right" }}>
                {message.length}/{FEEDBACK_MAX}
              </span>
            </div>
            <div className="field">
              <label htmlFor="fb-email">
                Email <span className="dim">(optional — only if you&apos;d like a reply)</span>
              </label>
              <input id="fb-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            {/* Honeypot: hidden from people and screen readers; bots tend to fill it. */}
            <div className="hp-field" aria-hidden="true">
              <label htmlFor="fb-website">Website</label>
              <input id="fb-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
            <label className="check-row small">
              <input type="checkbox" checked={attachContext} onChange={(e) => setAttachContext(e.target.checked)} />
              <span>
                Attach technical details <span className="dim">(page, app version, screen size, browser, price source)</span>
              </span>
            </label>
            <label className={clsx("check-row small", !attachContext && "dim")}>
              <input type="checkbox" checked={includePortfolio} disabled={!attachContext} onChange={(e) => setIncludePortfolio(e.target.checked)} />
              <span>Include a summary of my paper portfolio (total, cash, tickers and share counts)</span>
            </label>

            {error ? (
              <span className="form-error" role="alert">
                {error}
              </span>
            ) : null}

            {online ? (
              <button type="submit" className="btn btn-primary btn-block" disabled={status === "sending"}>
                <Send size={15} /> {status === "sending" ? "Sending…" : "Send feedback"}
              </button>
            ) : (
              <div className="stack gap-sm">
                <span className="small muted">In-app sending isn&apos;t set up on this build, so send it one of these ways (your text is prefilled):</span>
                <div className="row wrap gap-sm">
                  {mailto ? (
                    <a className={clsx("btn btn-primary", !valid && "disabled")} href={valid ? mailto : undefined} aria-disabled={!valid} onClick={() => valid && track("feedback_sent")}>
                      <Mail size={15} /> Email it
                    </a>
                  ) : null}
                  <a
                    className={clsx("btn", !mailto && "btn-primary", !valid && "disabled")}
                    href={valid ? githubIssueLink(payload) : undefined}
                    aria-disabled={!valid}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={15} /> Open a GitHub issue
                  </a>
                </div>
                <span className="small dim">GitHub issues are public — leave out anything personal.</span>
                {!valid ? <span className="small dim">Write a short message (at least 3 characters) to enable these.</span> : null}
              </div>
            )}
            <span className="small dim">
              Never shared or sold. See the <Link href="/privacy">privacy policy</Link>.
            </span>
          </form>
        )}
      </div>
    </div>
  );
}
