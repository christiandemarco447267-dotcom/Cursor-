export function WellnessScore({
  score,
  label,
}: {
  score: number;
  label: string;
}) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="rgba(16,39,44,0.08)"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--sea)"
            strokeWidth="8"
            strokeLinecap="round"
            className="score-ring"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-3xl text-ink">{score}</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sea">
          Wellness score
        </p>
        <p className="mt-1 font-display text-2xl text-ink">{label}</p>
        <p className="mt-1 max-w-xs text-sm text-ink-soft">
          Weighted from emergency cover, savings rate, debt pressure, and cash
          flow.
        </p>
      </div>
    </div>
  );
}
