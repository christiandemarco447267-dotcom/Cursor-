import type { Profile } from "./types";

export const EXPERIENCE_OPTIONS: { value: NonNullable<Profile["experience"]>; label: string; hint: string }[] = [
  { value: "new", label: "New to investing", hint: "Just getting started" },
  { value: "some", label: "Some experience", hint: "I know the basics" },
  { value: "experienced", label: "Experienced", hint: "I invest regularly" },
];

export const FOCUS_OPTIONS: { value: NonNullable<Profile["focus"]>; label: string; hint: string }[] = [
  { value: "learn", label: "Learn the basics", hint: "Understand how investing works" },
  { value: "discipline", label: "Build discipline", hint: "Invest with a repeatable process" },
  { value: "growth", label: "Track long-term growth", hint: "Follow a portfolio over time" },
  { value: "explore", label: "Just exploring", hint: "Experiment and have fun" },
];

export const AVATAR_COLORS = ["#0d9488", "#2563eb", "#0ea5e9", "#7c3aed", "#e11d48", "#f59e0b"];

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function experienceLabel(value: Profile["experience"]): string {
  return EXPERIENCE_OPTIONS.find((o) => o.value === value)?.label ?? "";
}

export function focusLabel(value: Profile["focus"]): string {
  return FOCUS_OPTIONS.find((o) => o.value === value)?.label ?? "";
}
