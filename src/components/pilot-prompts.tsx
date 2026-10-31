"use client";

// Pilot helpers mounted once in the app shell: the analytics consent notice,
// page-view counting (only after consent), and the one-time 7-day micro-survey.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { BarChart3, Star, X } from "lucide-react";
import { analyticsAvailable, readConsent, setConsent, subscribeConsent, trackPageView, type Consent } from "@/lib/analytics";
import { feedbackApiAvailable, sendFeedback } from "@/lib/feedback";
import { useApp } from "@/lib/store";
import { ensureFirstSeen, setSurveyStatus, shouldShowSurvey, subscribeSurvey, SURVEY_FOLLOWUP, SURVEY_QUESTION, surveyStatus } from "@/lib/survey";

const serverConsent = (): Consent => "denied"; // never render the notice during prerender

export function useAnalyticsConsent(): Consent {
  return useSyncExternalStore(subscribeConsent, readConsent, serverConsent);
}

/** Counts a page view on each route change — only when analytics is available and accepted. */
export function PageViewTracker() {
  const pathname = usePathname();
  const consent = useAnalyticsConsent();
  useEffect(() => {
    if (consent === "granted") trackPageView(pathname);
  }, [pathname, consent]);
  return null;
}

/** Small first-run notice asking for analytics consent (default off). Hidden when no API is configured. */
export function AnalyticsNotice() {
  const consent = useAnalyticsConsent();
  const { profileSetupOpen, tourOpen } = useApp();
  if (!analyticsAvailable() || consent !== "unset" || profileSetupOpen || tourOpen) return null;
  return (
    <div className="pilot-card" role="region" aria-label="Usage statistics">
      <span className="pilot-card-icon" aria-hidden="true">
        <BarChart3 size={18} />
      </span>
      <div className="stack gap-sm grow" style={{ minWidth: 0 }}>
        <strong>Help improve Sentia?</strong>
        <span className="small muted">
          Allow anonymous usage counts: which pages are opened and a few actions (like &ldquo;trade placed&rdquo;). No cookies, no
          personal or portfolio data. Change it anytime in Settings. <Link href="/privacy">Privacy</Link>
        </span>
        <div className="row wrap gap-sm">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setConsent("granted")}>
            Allow
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setConsent("denied")}>
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}

function useSurveyDue(): boolean {
  // Read on the client only; the snapshot is a primitive so it's stable between renders.
  return useSyncExternalStore(
    subscribeSurvey,
    () => shouldShowSurvey(ensureFirstSeen(), surveyStatus(), Date.now()),
    () => false,
  );
}

/** One-time micro-survey, 7 days after first use. Needs the Sentia API (otherwise there's nowhere to send it). */
export function MicroSurvey() {
  const due = useSurveyDue();
  const consent = useAnalyticsConsent();
  const { profileSetupOpen, tourOpen } = useApp();
  const [rating, setRating] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  // Don't stack on top of the consent notice or first-run dialogs.
  const noticeShowing = analyticsAvailable() && consent === "unset";
  if (!feedbackApiAvailable() || !due || noticeShowing || profileSetupOpen || tourOpen) {
    return state === "sent" ? <SurveyThanks /> : null;
  }

  const submit = async () => {
    if (!rating) return;
    setState("sending");
    try {
      await sendFeedback({ type: "survey", rating, message: answer.trim().slice(0, 500) });
      setState("sent");
      setSurveyStatus("done");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="pilot-card" role="dialog" aria-labelledby="survey-title">
      <button type="button" className="btn btn-icon btn-sm pilot-card-close" aria-label="Dismiss survey" onClick={() => setSurveyStatus("dismissed")}>
        <X size={14} />
      </button>
      <div className="stack gap-sm grow" style={{ minWidth: 0 }}>
        <strong id="survey-title">Quick question (10 seconds)</strong>
        <span className="small muted">{SURVEY_QUESTION}</span>
        <div className="row gap-sm" role="radiogroup" aria-label="Rating from 1 to 5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} out of 5`}
              className={`chip survey-star ${rating !== null && n <= rating ? "on" : ""}`}
              onClick={() => setRating(n)}
            >
              <Star size={14} fill={rating !== null && n <= rating ? "currentColor" : "none"} />
              {n}
            </button>
          ))}
        </div>
        <label className="small muted" htmlFor="survey-answer">
          {SURVEY_FOLLOWUP} <span className="dim">(optional)</span>
        </label>
        <input id="survey-answer" className="input" maxLength={500} value={answer} onChange={(e) => setAnswer(e.target.value)} />
        {state === "error" ? (
          <span className="form-error" role="alert">
            Couldn&apos;t send — try again in a moment.
          </span>
        ) : null}
        <div className="row gap-sm">
          <button type="button" className="btn btn-primary btn-sm" disabled={!rating || state === "sending"} onClick={() => void submit()}>
            {state === "sending" ? "Sending…" : "Send"}
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setSurveyStatus("dismissed")}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

function SurveyThanks() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setHidden(true), 4000);
    return () => clearTimeout(id);
  }, []);
  if (hidden) return null;
  return (
    <div className="pilot-card" role="status">
      <span className="form-ok">Thanks for the feedback!</span>
    </div>
  );
}
