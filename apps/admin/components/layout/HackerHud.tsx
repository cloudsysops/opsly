'use client';

import { useMemo } from 'react';
import { Activity, ShieldCheck, TerminalSquare } from 'lucide-react';

function pseudoHash(seed: string): number {
  let value = 0;
  for (let index = 0; index < seed.length; index += 1) {
    value = (value * 31 + seed.charCodeAt(index)) % 10_000;
  }
  return value;
}

export function HackerHud() {
  const now = new Date();
  const seed = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}`;
  const id = useMemo(() => pseudoHash(seed).toString().padStart(4, '0'), [seed]);
  const activeSignals = useMemo(() => (pseudoHash(`${seed}-sig`) % 17) + 5, [seed]);
  const threatScore = useMemo(() => (pseudoHash(`${seed}-th`) % 22) + 74, [seed]);

  return (
    <div className="holo-border mx-6 mt-3 flex items-center justify-between rounded-xl bg-ops-bg/70 px-4 py-2 text-[11px]">
      <div className="flex items-center gap-4 text-ops-cyan">
        <span className="digital-readout">NODE OPS-{id}</span>
        <span className="flex items-center gap-1 text-ops-magenta">
          <TerminalSquare className="h-3.5 w-3.5" />
          MATRIX LINKED
        </span>
      </div>
      <div className="flex items-center gap-4 text-neutral-300">
        <span className="flex items-center gap-1">
          <Activity className="h-3.5 w-3.5 text-ops-cyan" />
          SIGNALS {activeSignals}
        </span>
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-ops-green" />
          DEFENSE {threatScore}%
        </span>
      </div>
    </div>
  );
}
