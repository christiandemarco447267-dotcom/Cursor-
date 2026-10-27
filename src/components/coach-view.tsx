"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Sparkles } from "lucide-react";
import { COACH_DISCLAIMER, ruleBasedCoach, SUGGESTED_QUESTIONS, type CoachProvider, type CoachReply } from "@/lib/coach";
import { useApp } from "@/lib/store";
import { Loading, Panel, PageHeader } from "./ui";

type Message = { id: number; role: "user" | "coach"; text: string; reply?: CoachReply };

// Swap in another CoachProvider (e.g. an LLM-backed one) here; the UI only depends on the interface.
const PROVIDER: CoachProvider = ruleBasedCoach;

const WELCOME: Message = {
  id: 0,
  role: "coach",
  text: "Hi, I'm Sentia. Ask me about your paper portfolio — concentration, cash, winners and losers, theses, biases or your Discipline Score.",
};

export function CoachView() {
  const { ready, state, summary } = useApp();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const seq = useRef(1);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  if (!ready || !state || !summary) return <Loading />;

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setInput("");
    setBusy(true);
    const userMsg: Message = { id: seq.current++, role: "user", text: q.slice(0, 300) };
    setMessages((m) => [...m, userMsg]);
    try {
      const reply = await PROVIDER.answer(q, { state, summary });
      setMessages((m) => [...m, { id: seq.current++, role: "coach", text: reply.text, reply }]);
    } catch {
      setMessages((m) => [...m, { id: seq.current++, role: "coach", text: "Sorry, I couldn't work that out. Try one of the suggestions." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack gap-lg animate-in">
      <PageHeader title="Ask Sentia" subtitle="A coach that answers from your own paper account. Runs entirely on this device." />

      <Panel strong className="stack gap-md">
        <div className="row between wrap gap-sm">
          <strong className="row gap-sm">
            <MessageCircle size={18} /> Coach
          </strong>
          <span className="pill pill-compact">
            <Sparkles size={13} /> Rule-based · offline
          </span>
        </div>
        <div className="chat-log" ref={logRef} aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className={`bubble ${m.role === "user" ? "bubble-user" : "bubble-coach"}`}>
              <span>{m.text}</span>
              {m.reply?.bullets?.length ? (
                <ul className="small">
                  {m.reply.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              ) : null}
              {m.reply?.links?.length ? (
                <div className="row wrap gap-sm" style={{ marginTop: 10 }}>
                  {m.reply.links.map((l) => (
                    <Link key={l.href} href={l.href} className="btn btn-sm">
                      {l.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <div className="row wrap gap-sm" aria-label="Suggested questions">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button key={q} type="button" className="chip" onClick={() => void ask(q)} disabled={busy}>
              {q}
            </button>
          ))}
        </div>
        <form
          className="row gap-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
        >
          <input
            className="input grow"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your portfolio…"
            maxLength={300}
            aria-label="Your question"
          />
          <button type="submit" className="btn btn-primary" disabled={busy || !input.trim()} aria-label="Send">
            <Send size={16} />
          </button>
        </form>
      </Panel>

      <p className="disclaimer">{COACH_DISCLAIMER} Answers come from simple rules applied to your simulated data.</p>
    </div>
  );
}
