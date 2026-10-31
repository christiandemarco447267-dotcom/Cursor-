// The one-time 7-day micro-survey (pure timing logic unit-tested).
export const FIRST_SEEN_KEY = "sentia.firstSeen.v1";
export const SURVEY_KEY = "sentia.survey.v1";
export const SURVEY_DELAY_MS = 7 * 86_400_000;
export const SURVEY_QUESTION = "How useful is Sentia for practicing investing?";
export const SURVEY_FOLLOWUP = "What's one thing that would make it more useful?";

export type SurveyStatus = "done" | "dismissed" | null;

export function shouldShowSurvey(firstSeen: number | null, status: SurveyStatus, now: number): boolean {
  if (status) return false; // shown once: answered or dismissed
  if (firstSeen === null || !Number.isFinite(firstSeen)) return false;
  return now - firstSeen >= SURVEY_DELAY_MS;
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage blocked: the prompt simply won't persist its state
  }
}

const listeners = new Set<() => void>();
export function subscribeSurvey(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Records the first visit (once) and returns it. */
export function ensureFirstSeen(now: number = Date.now()): number {
  const raw = read(FIRST_SEEN_KEY);
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  write(FIRST_SEEN_KEY, String(now));
  return now;
}

export function surveyStatus(): SurveyStatus {
  const v = read(SURVEY_KEY);
  return v === "done" || v === "dismissed" ? v : null;
}

export function setSurveyStatus(status: Exclude<SurveyStatus, null>) {
  write(SURVEY_KEY, status);
  for (const l of listeners) l();
}
