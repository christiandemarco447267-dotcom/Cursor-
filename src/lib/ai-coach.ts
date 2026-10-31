// Client for the AI coach (/coach on the Sentia API). Streams plain text. Every
// failure (no API, rate limit, timeout, provider error) is reported as a
// CoachFallback so the UI can answer with the built-in coach instead.
import { apiConfigured, apiUrl } from "./api-config";

export const FIRST_BYTE_TIMEOUT_MS = 15_000;
export const TOTAL_TIMEOUT_MS = 40_000;
export const AI_QUESTION_MAX = 300;

export class CoachFallback extends Error {
  constructor(
    message: string,
    readonly reason: "not-configured" | "rate-limited" | "timeout" | "unavailable",
  ) {
    super(message);
  }
}

export function aiCoachConfigured(): boolean {
  return apiConfigured();
}

/** Stream an answer; `onText` receives the full text so far. Resolves with the final text. */
export async function askAiCoach(
  question: string,
  context: string,
  onText: (textSoFar: string) => void,
  opts: { fetchImpl?: typeof fetch; firstByteMs?: number; totalMs?: number } = {},
): Promise<string> {
  if (!apiConfigured() && !opts.fetchImpl) throw new CoachFallback("AI coach isn't set up on this build.", "not-configured");
  const doFetch = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  let timedOut = false;
  const total = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, opts.totalMs ?? TOTAL_TIMEOUT_MS);
  let firstByte: ReturnType<typeof setTimeout> | null = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, opts.firstByteMs ?? FIRST_BYTE_TIMEOUT_MS);
  const clearFirst = () => {
    if (firstByte) clearTimeout(firstByte);
    firstByte = null;
  };

  try {
    const res = await doFetch(apiUrl("/coach"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "omit",
      body: JSON.stringify({ question: question.slice(0, AI_QUESTION_MAX), context }),
      signal: controller.signal,
    });
    if (res.status === 429) {
      let msg = "AI coach limit reached for now.";
      try {
        msg = ((await res.json()) as { error?: string }).error ?? msg;
      } catch {
        // keep default
      }
      throw new CoachFallback(msg, "rate-limited");
    }
    if (res.status === 503) throw new CoachFallback("AI coach isn't configured on the server.", "not-configured");
    if (!res.ok || !res.body) throw new CoachFallback(`AI coach unavailable (${res.status}).`, "unavailable");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      clearFirst();
      text += decoder.decode(value, { stream: true });
      onText(text);
    }
    text += decoder.decode();
    if (!text.trim()) throw new CoachFallback("AI coach returned an empty answer.", "unavailable");
    return text.trim();
  } catch (error) {
    if (error instanceof CoachFallback) throw error;
    if (timedOut) throw new CoachFallback("AI coach took too long to answer.", "timeout");
    throw new CoachFallback("Couldn't reach the AI coach.", "unavailable");
  } finally {
    clearFirst();
    clearTimeout(total);
  }
}
