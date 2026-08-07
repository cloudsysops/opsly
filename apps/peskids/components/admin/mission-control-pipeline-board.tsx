'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { normalizeLeadSourceLabel } from '@/lib/admin/lead-source-label';
import { formatAgeRange } from '@/lib/peskids-domain';
import type { PipelineBoard, PipelineColumnId } from '@/lib/services/lead-pipeline.service';
import { PIPELINE_COLUMN_LABELS, PIPELINE_COLUMN_ORDER } from '@/lib/services/lead-pipeline.service';
import { Badge } from '@/components/ui/badge';
import { cn, formatRelativeTime } from '@/lib/utils';

type PipelineApiResponse = PipelineBoard & { ok?: boolean; error?: string };

/** Compact, density-matched view of the same pipeline data/API as
 * lead-pipeline-kanban.tsx (full filters/move UI lives there — this is the
 * Mission Control glance view; click-through to /admin/pipeline to act). */
const COLUMN_DOT: Record<PipelineColumnId, string> = {
  nuevos: 'bg-sky-500',
  contactados: 'bg-teal-500',
  trial_agendado: 'bg-amber-500',
  trial_realizado: 'bg-violet-500',
  matriculados: 'bg-emerald-500',
  perdidos: 'bg-slate-400',
};

export function MissionControlPipelineBoard(): React.ReactElement {
  const [board, setBoard] = useState<PipelineBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/pipeline', { credentials: 'include' });
      if (!response.ok) throw new Error('No se pudo cargar el pipeline');
      const json = (await response.json()) as PipelineApiResponse;
      setBoard({ columns: json.columns, counts: json.counts, total: json.total });
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar pipeline');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-pk-mutedText">
            Pipeline de leads
          </p>
          <h2 className="font-display text-xl font-semibold text-pk-ink">
            {board ? `${board.total} interesado${board.total === 1 ? '' : 's'}` : 'Pipeline'}
          </h2>
        </div>
        <Link
          href="/admin/pipeline"
          className="pk-focus rounded-xl border border-pk-border bg-pk-surface px-3 py-2 text-xs font-semibold text-pk-primary hover:bg-pk-muted"
        >
          Vista completa (filtros, mover etapa)
        </Link>
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-pk-primary" aria-hidden />
          <p className="text-sm text-pk-sub">Cargando pipeline…</p>
        </div>
      ) : error || !board ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300">
          {error || 'Sin datos de pipeline'}
        </p>
      ) : (
        <div className="snap-x snap-mandatory overflow-x-auto pb-2">
          <div className="flex min-w-max gap-4">
            {PIPELINE_COLUMN_ORDER.map((columnId) => (
              <section
                key={columnId}
                aria-label={PIPELINE_COLUMN_LABELS[columnId]}
                className="flex w-[min(100vw-2rem,16rem)] shrink-0 snap-start flex-col rounded-2xl border border-pk-border bg-pk-muted/40"
              >
                <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-pk-border bg-pk-muted/95 px-3 py-2.5 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn('h-2.5 w-2.5 rounded-full', COLUMN_DOT[columnId])}
                      aria-hidden
                    />
                    <h3 className="text-sm font-semibold text-pk-ink">
                      {PIPELINE_COLUMN_LABELS[columnId]}
                    </h3>
                  </div>
                  <Badge tone="neutral">{board.counts[columnId]}</Badge>
                </header>
                <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto p-2.5">
                  {board.columns[columnId].length === 0 ? (
                    <p className="rounded-xl border border-dashed border-pk-border bg-pk-surface/60 px-3 py-4 text-center text-[11px] text-pk-sub">
                      Sin tarjetas
                    </p>
                  ) : (
                    board.columns[columnId].map((card) => (
                      <Link
                        key={card.lead.id}
                        href={`/admin/interesados/${card.lead.id}`}
                        className={cn(
                          'pk-focus block rounded-xl border bg-pk-surface px-3 py-2.5 text-xs shadow-sm transition-shadow hover:shadow-card-hover',
                          card.overdue ? 'border-amber-300 ring-1 ring-amber-100' : 'border-pk-border'
                        )}
                      >
                        <p className="truncate font-semibold text-pk-ink">{card.lead.name}</p>
                        <p className="mt-0.5 text-[11px] text-pk-sub">
                          {formatAgeRange(card.lead.grade_interested)}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          <Badge tone="violet" className="px-1.5 py-0 text-[10px]">
                            {normalizeLeadSourceLabel(card.lead.referral_source)}
                          </Badge>
                          <span className="text-[10px] text-pk-mutedText">
                            {formatRelativeTime(new Date(card.stage_entered_at))}
                          </span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
