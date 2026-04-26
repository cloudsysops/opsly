'use client';

import { cn } from '@/lib/utils';

export function ActivityChart({
  buckets,
  isLoading,
}: {
  buckets: { date: string; count: number }[] | undefined;
  isLoading: boolean;
}) {
  if (isLoading || !buckets) {
    return (
      <div className="flex h-32 items-end gap-1 border border-ops-border bg-ops-surface p-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-full flex-1 animate-pulse rounded-sm bg-ops-border/40" />
        ))}
      </div>
    );
  }

  const max = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <div className="border border-ops-border bg-ops-surface p-3">
      <div className="mb-2 font-sans text-xs uppercase text-ops-gray">
        Actividad (7 días, audit_log)
      </div>
      <div className="flex h-28 items-end gap-1">
        {buckets.map((b) => {
          const h = Math.round((b.count / max) * 100);
          return (
            <div key={b.date} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  'w-full rounded-sm bg-ops-green/40 transition-all',
                  b.count > 0 && 'bg-ops-green/80'
                )}
                style={{ height: `${Math.max(8, h)}%` }}
                title={`${b.date}: ${b.count}`}
              />
              <span className="font-mono text-[10px] text-ops-gray">{b.date.slice(5)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
