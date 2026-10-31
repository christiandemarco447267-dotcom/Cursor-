// Lightweight celebrations: a short canvas confetti burst (no dependencies) and a
// haptic tap where supported. Confetti is skipped when the OS asks for reduced motion.
import { isNativeRuntime } from "./platform";
import type { Settings } from "./types";

export function prefersReducedMotion(): boolean {
  try {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

const COLORS = ["#a78bfa", "#8b5cf6", "#6366f1", "#2dd4bf", "#34d399", "#f9a8d4", "#fde68a"];
let running = false;

export function confetti(durationMs = 1600, count = 110) {
  if (typeof document === "undefined" || running || prefersReducedMotion()) return;
  running = true;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999";
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    running = false;
    return;
  }
  ctx.scale(dpr, dpr);
  const W = window.innerWidth;
  const H = window.innerHeight;
  const parts = Array.from({ length: count }, () => ({
    x: W / 2 + (Math.random() - 0.5) * W * 0.3,
    y: H * 0.35,
    vx: (Math.random() - 0.5) * 11,
    vy: -Math.random() * 11 - 4,
    size: 5 + Math.random() * 6,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }));
  const start = performance.now();
  const frame = (now: number) => {
    const t = now - start;
    ctx.clearRect(0, 0, W, H);
    const fade = Math.max(0, 1 - Math.max(0, t - durationMs * 0.6) / (durationMs * 0.4));
    for (const p of parts) {
      p.vy += 0.32;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    if (t < durationMs) requestAnimationFrame(frame);
    else {
      canvas.remove();
      running = false;
    }
  };
  requestAnimationFrame(frame);
}

export function haptic(pattern: number | number[] = [24, 40, 24]) {
  // In the iOS/Android app use the native Taptic/vibration engine (navigator.vibrate is absent on iOS).
  if (isNativeRuntime()) {
    void import("@capacitor/haptics")
      .then(({ Haptics, NotificationType }) => Haptics.notification({ type: NotificationType.Success }))
      .catch(() => undefined);
    return;
  }
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(pattern);
  } catch {
    // Unsupported (e.g. iOS Safari): silently skip.
  }
}

/** Celebrate per the user's settings. */
export function celebrate(settings: Pick<Settings, "celebrations" | "haptics">) {
  if (settings.celebrations) confetti();
  if (settings.haptics) haptic();
}
