'use client';

import Link from 'next/link';
import useSWR from 'swr';
import {
  MoonCard,
  MoonConfidenceBadge,
  MoonEmptyState,
  MoonErrorState,
  MoonPageHeader,
  MoonSkeleton,
} from '@/components/moon/primitives';
import { getTeamMetrics } from '@/lib/api-client';
import { summarizeQueueFromTeams } from '@/lib/moon/queue-mapper';

export default function MoonQueuePage(): React.ReactElement {
  const { data, error, isLoading } = useSWR('moon-queue-teams', () => getTeamMetrics(), {
    revalidateOnFocus: false,
  });
  const summary = summarizeQueueFromTeams(data?.teams ?? []);

  return (
    <div className="space-y-6">
      <MoonPageHeader
        title="Queue"
        subtitle="Resumen BullMQ vía agregados de teams. Pause/resume requieren API + approval."
        actions={
          <Link
            href="/moon/tasks"
            className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs"
          >
            Tasks
          </Link>
        }
      />
      {isLoading ? <MoonSkeleton /> : null}
      {error ? <MoonErrorState message={String(error.message)} /> : null}
      {!isLoading && !error && summary.teams === 0 ? (
        <MoonEmptyState
          title="Cola sin métricas"
          description="No hay teams en la respuesta. No se simulan depths."
        />
      ) : null}
      {summary.teams > 0 ? (
        <MoonCard className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <h2 className="font-mono text-sm">{summary.queue}</h2>
            <MoonConfidenceBadge confidence={summary.confidence} />
          </div>
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-slate-500">waiting</dt>
              <dd className="font-mono text-xl">{summary.waiting}</dd>
            </div>
            <div>
              <dt className="text-slate-500">active</dt>
              <dd className="font-mono text-xl">{summary.active}</dd>
            </div>
            <div>
              <dt className="text-slate-500">teams</dt>
              <dd className="font-mono text-xl">{summary.teams}</dd>
            </div>
          </dl>
          <p className="text-xs text-slate-500">Fuente: {summary.source}</p>
          <p className="text-xs text-amber-200/80">
            Acciones sensibles (pause/resume/remove failed) deshabilitadas hasta contrato
            approval-first.
          </p>
        </MoonCard>
      ) : null}
    </div>
  );
}
