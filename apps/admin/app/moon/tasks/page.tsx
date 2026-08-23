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
  MoonStatusBadge,
} from '@/components/moon/primitives';
import { getTeamMetrics } from '@/lib/api-client';
import { mapTeamMetricsToMoonTasks } from '@/lib/moon/queue-mapper';
import type { MoonHealthTone } from '@/lib/moon/tenant-card';

function statusTone(status: string): MoonHealthTone {
  if (status === 'running') return 'warning';
  if (status === 'idle') return 'healthy';
  if (status === 'error') return 'critical';
  return 'unknown';
}

export default function MoonTasksPage(): React.ReactElement {
  const { data, error, isLoading } = useSWR('moon-tasks-teams', () => getTeamMetrics(), {
    revalidateOnFocus: false,
  });
  const tasks = mapTeamMetricsToMoonTasks(data?.teams ?? []);

  return (
    <div className="space-y-6">
      <MoonPageHeader
        title="Tasks"
        subtitle="Read-model desde métricas de teams/cola. AgentTaskEnvelopeV1 no existe — no inventado."
        actions={
          <Link
            href="/moon/queue"
            className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs"
          >
            Ver queue
          </Link>
        }
      />
      <MoonCard className="p-3 text-xs text-slate-400">
        Acciones cancel/retry/pause: solo cuando exista API segura + approval. Esta vista es
        inspect-only.
        <span className="ml-2 inline-block">
          <MoonConfidenceBadge confidence="REAL" />
        </span>
      </MoonCard>
      {isLoading ? <MoonSkeleton className="h-32" /> : null}
      {error ? <MoonErrorState message={String(error.message)} /> : null}
      {!isLoading && !error && tasks.length === 0 ? (
        <MoonEmptyState
          title="Sin señales de tasks"
          description="GET /api/metrics/teams no devolvió teams. No se fabrican jobs."
        />
      ) : null}
      <div className="space-y-2">
        {tasks.map((t) => (
          <MoonCard
            key={t.task_id}
            className="flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div>
              <p className="font-mono text-sm text-slate-100">{t.task_id}</p>
              <p className="text-xs text-slate-500">
                queue={t.queue} · agent={t.agent} · {t.specialization}
              </p>
              <p className="mt-1 text-[10px] text-slate-600">{t.note}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-400">
                wait {t.waiting ?? '—'} / active {t.active ?? '—'}
              </span>
              <MoonStatusBadge tone={statusTone(t.status)}>{t.status}</MoonStatusBadge>
            </div>
          </MoonCard>
        ))}
      </div>
    </div>
  );
}
