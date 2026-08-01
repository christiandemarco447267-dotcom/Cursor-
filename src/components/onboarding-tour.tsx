"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeftRight, Compass, HeartPulse, Sparkles, Target, Wallet } from "lucide-react";
import type { ComponentType } from "react";
import { useApp } from "@/lib/store";

type Step = {
  icon: ComponentType<{ size?: number }>;
  title: string;
  body: string;
  href?: string;
  cta?: string;
};

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: "Welcome to Sentia",
    body: "Practice investing with a real process — no real money. You start with a demo portfolio and $25,000 in virtual cash to experiment with.",
  },
  {
    icon: ArrowLeftRight,
    title: "Buy & sell for real practice",
    body: "Trade against your cash balance. Sentia tracks your weighted-average cost basis and realizes profit or loss on every sale — just like the real thing.",
    href: "/app/trade",
    cta: "Open Trade",
  },
  {
    icon: Wallet,
    title: "Track everything",
    body: "Your Portfolio shows holdings, total value, and gains. Allocation shows how your money is spread across positions and cash.",
    href: "/app/portfolio",
    cta: "View Portfolio",
  },
  {
    icon: Target,
    title: "Invest with intent",
    body: "Set savings Goals and write a short Thesis for each position, so future-you remembers exactly why you bought it.",
    href: "/app/thesis",
    cta: "Write a thesis",
  },
  {
    icon: HeartPulse,
    title: "Build durable habits",
    body: "Log a daily mood check-in, work through bite-size lessons, and earn XP, levels, and streaks as your process improves.",
    href: "/app/check-in",
    cta: "Daily check-in",
  },
  {
    icon: Compass,
    title: "You're all set",
    body: "Explore the workspace at your own pace. You can replay this tour anytime from Settings.",
  },
];

export function OnboardingTour() {
  const { tourOpen, closeTour, actions } = useApp();
  const [step, setStep] = useState(0);

  const finish = () => {
    actions.completeOnboarding();
    closeTour();
    setStep(0);
  };

  useEffect(() => {
    if (!tourOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourOpen]);

  if (!tourOpen) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Getting started tour"
      onClick={(e) => {
        if (e.target === e.currentTarget) finish();
      }}
    >
      <div className="modal stack gap-md">
        <div className="row between">
          <span className="tour-icon">
            <Icon size={24} />
          </span>
          <button className="btn btn-sm" onClick={finish}>
            Skip
          </button>
        </div>

        <div className="stack gap-sm">
          <span className="eyebrow">
            Step {step + 1} of {STEPS.length}
          </span>
          <h2 style={{ fontSize: "1.5rem" }}>{current.title}</h2>
          <p className="muted">{current.body}</p>
        </div>

        {current.href ? (
          <Link href={current.href} className="btn btn-sm" style={{ width: "fit-content" }} onClick={finish}>
            {current.cta}
          </Link>
        ) : null}

        <div className="row between" style={{ marginTop: 8 }}>
          <div className="tour-dots">
            {STEPS.map((_, i) => (
              <span key={i} className={clsx("tour-dot", i === step && "active")} />
            ))}
          </div>
          <div className="row gap-sm">
            {step > 0 ? (
              <button className="btn btn-sm" onClick={() => setStep((s) => s - 1)}>
                Back
              </button>
            ) : null}
            <button className="btn btn-primary btn-sm" onClick={() => (isLast ? finish() : setStep((s) => s + 1))}>
              {isLast ? "Get started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
