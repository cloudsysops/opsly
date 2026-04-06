"use client";

const R = 52;
const C = 2 * Math.PI * R;

function gaugeColor(percent: number): string {
  if (percent < 60) {
    return "#22c55e";
  }
  if (percent < 85) {
    return "#eab308";
  }
  return "#ef4444";
}

export function CpuGauge({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = C - (clamped / 100) * C;
  const stroke = gaugeColor(clamped);

  return (
    <div className="relative mx-auto flex h-44 w-44 items-center justify-center">
      <svg
        className="-rotate-90"
        width="160"
        height="160"
        viewBox="0 0 120 120"
      >
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke="#1e1e1e"
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke={stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset,stroke] duration-500"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl tabular-nums text-neutral-100">
          {clamped.toFixed(1)}
        </span>
        <span className="font-sans text-xs text-ops-gray">% CPU</span>
      </div>
    </div>
  );
}
