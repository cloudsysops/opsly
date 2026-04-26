'use client';

import { relativeTime } from '@/lib/time';
import type { AuditLogEntry } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export function ActivityFeed({
  entries,
  isLoading,
  error,
}: {
  entries: AuditLogEntry[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
}) {
  if (error) {
    return (
      <div className="rounded border border-ops-red/50 bg-ops-red/10 px-3 py-2 font-sans text-sm text-ops-red">
        {error.message}
      </div>
    );
  }

  if (isLoading || !entries) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return <p className="font-sans text-sm text-ops-gray">Sin actividad reciente.</p>;
  }

  return (
    <ul className="space-y-0 border border-ops-border bg-ops-bg font-mono text-xs">
      {entries.map((e) => (
        <li
          key={e.id}
          className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-ops-border px-3 py-2 last:border-b-0"
        >
          <span className="text-ops-green">{e.action}</span>
          <span className="text-neutral-400">
            {e.tenant_slug ? <span className="text-neutral-200">{e.tenant_slug}</span> : '—'}
          </span>
          <span className="text-ops-gray">{e.actor}</span>
          <span className="ml-auto text-ops-gray">{relativeTime(e.created_at)}</span>
        </li>
      ))}
    </ul>
  );
}
