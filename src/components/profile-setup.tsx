"use client";

import clsx from "clsx";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { AVATAR_COLORS, EXPERIENCE_OPTIONS, FOCUS_OPTIONS, initialsOf } from "@/lib/profile";
import type { ProfileInput } from "@/lib/storage";
import type { Profile } from "@/lib/types";

export function ProfileSetup() {
  const { profileSetupOpen, closeProfileSetup, state, actions } = useApp();
  if (!profileSetupOpen || !state) return null;

  return (
    <ProfileSetupDialog
      initialName={state.profileName}
      initialColor={state.profile.avatarColor || AVATAR_COLORS[0]}
      initialExperience={state.profile.experience}
      initialFocus={state.profile.focus}
      onSave={(input) => {
        actions.saveProfile(input);
        closeProfileSetup();
      }}
    />
  );
}

function ProfileSetupDialog({
  initialName,
  initialColor,
  initialExperience,
  initialFocus,
  onSave,
}: {
  initialName: string;
  initialColor: string;
  initialExperience: Profile["experience"];
  initialFocus: Profile["focus"];
  onSave: (input: ProfileInput) => void;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName);
  const [avatarColor, setAvatarColor] = useState(initialColor);
  const [experience, setExperience] = useState<Profile["experience"]>(initialExperience);
  const [focus, setFocus] = useState<Profile["focus"]>(initialFocus);

  const TOTAL = 3;
  const isLast = step === TOTAL - 1;
  const initials = initialsOf(name) || "?";

  const save = () => onSave({ name, avatarColor, experience, focus });

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Set up your profile"
      onClick={(e) => {
        if (e.target === e.currentTarget) save();
      }}
    >
      <div className="modal stack gap-md">
        <div className="row between">
          <span className="eyebrow">
            Set up your profile · {step + 1} of {TOTAL}
          </span>
          <button className="btn btn-sm" onClick={save}>
            Skip
          </button>
        </div>

        {step === 0 ? (
          <div className="stack gap-md">
            <div className="row gap-md" style={{ alignItems: "center" }}>
              <span className="avatar avatar-lg" style={{ background: avatarColor }}>
                {initials}
              </span>
              <div className="stack" style={{ gap: 2 }}>
                <h2 style={{ fontSize: "1.4rem" }}>Create your profile</h2>
                <span className="small muted">This stays private, in your browser.</span>
              </div>
            </div>
            <div className="field">
              <label htmlFor="setup-name">Your name</label>
              <input
                id="setup-name"
                name="name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex"
                maxLength={40}
                autoFocus
              />
            </div>
            <div className="field">
              <label>Pick an avatar color</label>
              <div className="row gap-sm wrap">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Avatar color ${color}`}
                    className={clsx("swatch", color === avatarColor && "selected")}
                    style={{ background: color }}
                    onClick={() => setAvatarColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="stack gap-md">
            <h2 style={{ fontSize: "1.4rem" }}>How much investing experience do you have?</h2>
            <div className="stack gap-sm">
              {EXPERIENCE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={clsx("choice", experience === option.value && "selected")}
                  onClick={() => setExperience(option.value)}
                >
                  <strong>{option.label}</strong>
                  <span className="small muted">{option.hint}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="stack gap-md">
            <h2 style={{ fontSize: "1.4rem" }}>What&apos;s your main focus?</h2>
            <div className="stack gap-sm">
              {FOCUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={clsx("choice", focus === option.value && "selected")}
                  onClick={() => setFocus(option.value)}
                >
                  <strong>{option.label}</strong>
                  <span className="small muted">{option.hint}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="row between" style={{ marginTop: 4 }}>
          <div className="tour-dots">
            {Array.from({ length: TOTAL }).map((_, i) => (
              <span key={i} className={clsx("tour-dot", i === step && "active")} />
            ))}
          </div>
          <div className="row gap-sm">
            {step > 0 ? (
              <button className="btn btn-sm" onClick={() => setStep((s) => s - 1)}>
                Back
              </button>
            ) : null}
            <button className="btn btn-primary btn-sm" onClick={() => (isLast ? save() : setStep((s) => s + 1))}>
              {isLast ? "Finish setup" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
