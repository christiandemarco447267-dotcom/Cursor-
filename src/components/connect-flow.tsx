"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const INSTITUTIONS = [
  "Harbor Federal Credit Union",
  "First Coastal Bank",
  "Summit Community Bank",
  "Northline Credit Union",
];

export function ConnectFlow({ mode }: { mode: "sandbox" | "plaid" }) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "picking" | "linking" | "done">(
    "idle",
  );
  const [institution, setInstitution] = useState(INSTITUTIONS[0]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function connect() {
    setError(null);
    setStep("linking");

    try {
      const linkRes = await fetch("/api/banking/link-token", { method: "POST" });
      const linkData = (await linkRes.json()) as {
        linkToken?: string;
        userId?: string;
        error?: string;
      };
      if (!linkRes.ok) throw new Error(linkData.error ?? "Link token failed");

      // Sandbox: simulate Plaid Link success. Live mode would open Plaid Link with linkToken.
      const publicToken =
        mode === "plaid" ? `public-sandbox-${linkData.linkToken}` : "sandbox-demo";

      const connectRes = await fetch("/api/banking/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicToken,
          userId: linkData.userId,
          institutionName: institution,
        }),
      });
      const connectData = (await connectRes.json()) as { error?: string };
      if (!connectRes.ok) throw new Error(connectData.error ?? "Connect failed");

      setStep("done");
      startTransition(() => {
        router.push("/dashboard");
        router.refresh();
      });
    } catch (err) {
      setStep("picking");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-white/80 p-6 shadow-[0_20px_60px_rgba(16,39,44,0.08)] backdrop-blur sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-2xl text-ink">Bank connection</p>
        <span className="rounded-md bg-mist px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-sea-deep">
          {mode === "plaid" ? "Plaid live" : "Sandbox demo"}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        {mode === "plaid"
          ? "Live Plaid credentials detected. Completing exchange via API."
          : "No Plaid keys found—using a realistic sandbox profile so you can explore advice immediately."}
      </p>

      {step === "idle" && (
        <button
          type="button"
          onClick={() => setStep("picking")}
          className="mt-8 w-full rounded-md bg-sea px-5 py-3 text-sm font-semibold text-white transition hover:bg-sea-deep"
        >
          Continue to institutions
        </button>
      )}

      {(step === "picking" || step === "linking") && (
        <div className="mt-8 space-y-3">
          {INSTITUTIONS.map((name) => (
            <button
              key={name}
              type="button"
              disabled={step === "linking" || pending}
              onClick={() => setInstitution(name)}
              className={`flex w-full items-center justify-between rounded-md border px-4 py-3 text-left text-sm transition ${
                institution === name
                  ? "border-sea bg-mist text-ink"
                  : "border-line bg-foam text-ink-soft hover:border-sea/40"
              }`}
            >
              <span className="font-medium">{name}</span>
              <span className="text-xs uppercase tracking-wider">
                {institution === name ? "Selected" : "Select"}
              </span>
            </button>
          ))}

          <button
            type="button"
            disabled={step === "linking" || pending}
            onClick={connect}
            className="mt-4 w-full rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink-soft disabled:opacity-70"
          >
            {step === "linking" || pending
              ? "Linking accounts…"
              : `Securely connect ${institution}`}
          </button>
        </div>
      )}

      {step === "done" && (
        <p className="mt-8 text-sm font-medium text-sea-deep">
          Connected. Opening your dashboard…
        </p>
      )}

      {error && (
        <p className="mt-4 text-sm text-signal" role="alert">
          {error}
        </p>
      )}

      <p className="mt-8 text-xs leading-relaxed text-ink-soft/80">
        Read-only access. Harbor never stores bank login credentials. Set{" "}
        <code className="rounded bg-mist px-1">PLAID_CLIENT_ID</code> and{" "}
        <code className="rounded bg-mist px-1">PLAID_SECRET</code> to switch from
        sandbox to live banking data.
      </p>
    </div>
  );
}
