'use client';

import type { ReactElement } from 'react';
import { cn } from '@/lib/utils';

export interface ChartProps {
  data?: number[];
  labels?: string[];
  type?: 'line' | 'bar';
}

export function Chart({ data = [], labels = [], type = 'line' }: ChartProps): ReactElement {
  const safe = data.length > 0 ? data : [1];
  const max = Math.max(...safe, 1);

  return (
    <div className="flex h-56 w-full items-end justify-between gap-1 px-2 sm:gap-2">
      {safe.map((value, i) => (
        <div key={i} className="flex min-h-0 flex-1 flex-col items-center gap-1">
          <div
            className={cn(
              'w-full min-h-[4px] rounded-t transition-all duration-300',
              type === 'bar'
                ? 'bg-gradient-to-t from-blue-600 to-blue-400'
                : 'rounded-sm bg-sky-500/90'
            )}
            style={{ height: `${Math.max(8, (value / max) * 100)}%` }}
          />
          {labels[i] !== undefined && labels[i].length > 0 ? (
            <span className="text-[10px] text-[var(--text-muted)] sm:text-xs">{labels[i]}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
