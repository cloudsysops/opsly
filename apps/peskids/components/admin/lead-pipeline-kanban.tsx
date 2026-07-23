'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import type { LeadSourceDisplay } from '@/lib/admin/lead-source-label';
import { normalizeLeadSourceLabel } from '@/lib/admin/lead-source-label';
import { classModalityLabel, PESKIDS_CLASS_MODALITY_OPTIONS } from '@/lib/lead-modality';
import { formatAgeRange } from '@/lib/peskids-domain';
import type {
  PipelineBoard,
  PipelineColumnId,
  PipelineFilters,
  PipelineLeadCard,
} from '@/lib/services/lead-pipeline.service';
import {
  PIPELINE_COLUMN_ADMIN_STATUS,
  PIPELINE_COLUMN_LABELS,
  PIPELINE_COLUMN_ORDER,
} from '@/lib/services/lead-pipeline.service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, formatRelativeTime } from '@/lib/utils';

type PipelineApiResponse = PipelineBoard & {
  ok?: boolean;
  filters?: PipelineFilters;
  error?: string;
};

const SOURCE_FILTER_OPTIONS: Array<{ value: LeadSourceDisplay | 'all'; label: string }> = [
  { value: 'all', label: 'Todas las fuentes' },
  { value: 'Web', label: 'Web' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'Referido', label: 'Referido' },
  { value: 'Otro', label: 'Otro' },
];

const STAGE_OPTIONS: Array<{ column: PipelineColumnId; label: string }> =
  PIPELINE_COLUMN_ORDER.map((column) => ({
    column,
    label: PIPELINE_COLUMN_LABELS[column],
  }));

function buildQuery(filters: PipelineFilters): string {
  const params = new URLSearchParams();
  if (filters.source && filters.source !== 'all') {
    params.set('source', filters.source);
  }
  if (filters.modality && filters.modality !== 'all') {
    params.set('modality', filters.modality);
  }
  if (filters.created_from) {
    params.set('created_from', filters.created_from);
  }
  if (filters.created_to) {
    params.set('created_to', filters.created_to);
  }
  if (filters.overdue_only) {
    params.set('overdue_only', '1');
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const json = (await response.json()) as { error?: string };
    return json.error || fallback;
  } catch {
    return fallback;
  }
}

function PipelineCard({
  card,
  saving,
  onMove,
}: {
  card: PipelineLeadCard;
  saving: boolean;
  onMove: (leadId: string, targetColumn: PipelineColumnId) => void;
}): React.ReactElement {
  const { lead } = card;
  const [stageDraft, setStageDraft] = useState<PipelineColumnId>(card.column);

  useEffect(() => {
    setStageDraft(card.column);
  }, [card.column]);

  return (
    <article
      className={cn(
        'rounded-2xl border bg-white p-3 shadow-sm transition-shadow',
        card.overdue ? 'border-amber-300 ring-1 ring-amber-100' : 'border-pk-border'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/admin/interesados/${lead.id}`}
            className="font-semibold text-pk-ink hover:text-pk-primary hover:underline"
          >
            {lead.name}
          </Link>
          <p className="text-xs text-pk-sub">{formatAgeRange(lead.grade_interested)}</p>
        </div>
        <Link
          href={`/admin/interesados/${lead.id}`}
          className="pk-focus inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-pk-mutedText hover:text-pk-primary"
          aria-label={`Ver ficha de ${lead.name}`}
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge tone="amber">{classModalityLabel(lead.class_modality)}</Badge>
        <Badge tone="violet">{normalizeLeadSourceLabel(lead.referral_source)}</Badge>
      </div>

      <p className="mt-2 text-[11px] text-pk-sub">
        En etapa {formatRelativeTime(new Date(card.stage_entered_at))}
      </p>

      {card.overdue ? (
        <div className="mt-2 flex items-start gap-1.5 rounded-xl bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            {card.has_overdue_followup
              ? 'Seguimiento vencido'
              : (card.aging_badge?.label ?? 'Requiere atención')}
          </span>
        </div>
      ) : null}

      <div className="mt-3 space-y-1.5">
        <Label htmlFor={`stage-${lead.id}`} className="text-[11px] text-pk-sub">
          Mover etapa
        </Label>
        <select
          id={`stage-${lead.id}`}
          value={stageDraft}
          disabled={saving}
          onChange={(event) => {
            const next = event.target.value as PipelineColumnId;
            setStageDraft(next);
            if (next !== card.column) {
              onMove(lead.id, next);
            }
          }}
          className="w-full rounded-xl border border-pk-border bg-white px-2 py-2 text-xs font-medium text-pk-ink"
        >
          {STAGE_OPTIONS.map((option) => (
            <option key={option.column} value={option.column}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}

export function LeadPipelineKanban(): React.ReactElement {
  const [board, setBoard] = useState<PipelineBoard | null>(null);
  const [filters, setFilters] = useState<PipelineFilters>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');
    try {
      const response = await fetch(`/api/admin/pipeline${buildQuery(filters)}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, 'No se pudo cargar el pipeline'));
      }
      const json = (await response.json()) as PipelineApiResponse;
      setBoard({
        columns: json.columns,
        counts: json.counts,
        total: json.total,
      });
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar pipeline');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const moveLead = useCallback(
    async (leadId: string, targetColumn: PipelineColumnId) => {
      const snapshot = board;
      if (!snapshot) return;

      const previousCard = PIPELINE_COLUMN_ORDER.flatMap((columnId) =>
        snapshot.columns[columnId].map((card) => ({ columnId, card }))
      ).find((entry) => entry.card.lead.id === leadId);

      if (!previousCard) return;

      const nextStatus = PIPELINE_COLUMN_ADMIN_STATUS[targetColumn];
      if (targetColumn === 'perdidos') {
        const confirmed = window.confirm(
          '¿Marcar este interesado como perdido (archivado)? Podrás revertirlo cambiando la etapa.'
        );
        if (!confirmed) {
          return;
        }
      }

      const optimisticCard: PipelineLeadCard = {
        ...previousCard.card,
        column: targetColumn,
        lead: {
          ...previousCard.card.lead,
          status: nextStatus,
        },
      };

      const optimisticColumns = { ...snapshot.columns };
      optimisticColumns[previousCard.columnId] = optimisticColumns[previousCard.columnId].filter(
        (card) => card.lead.id !== leadId
      );
      optimisticColumns[targetColumn] = [optimisticCard, ...optimisticColumns[targetColumn]];

      const optimisticCounts = { ...snapshot.counts };
      optimisticCounts[previousCard.columnId] = Math.max(
        0,
        optimisticCounts[previousCard.columnId] - 1
      );
      optimisticCounts[targetColumn] += 1;

      setBoard({
        columns: optimisticColumns,
        counts: optimisticCounts,
        total: snapshot.total,
      });
      setSavingLeadId(leadId);
      setFeedback('');

      try {
        const response = await fetch(`/api/admin/leads/${leadId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        });
        if (!response.ok) {
          throw new Error(await readApiError(response, 'No se pudo actualizar la etapa'));
        }
        const json = (await response.json()) as { lead?: PipelineLeadCard['lead'] };
        if (json.lead) {
          setBoard((current) => {
            if (!current) return current;
            const columns = { ...current.columns };
            columns[targetColumn] = columns[targetColumn].map((card) =>
              card.lead.id === leadId
                ? {
                    ...card,
                    lead: json.lead as PipelineLeadCard['lead'],
                    column: targetColumn,
                  }
                : card
            );
            return { ...current, columns };
          });
        }
        setFeedback('Etapa actualizada.');
      } catch (err) {
        setBoard(snapshot);
        setFeedback(err instanceof Error ? err.message : 'Error al mover tarjeta');
      } finally {
        setSavingLeadId(null);
      }
    },
    [board]
  );

  const totalLabel = useMemo(() => {
    if (!board) return '';
    return `${board.total} interesado${board.total === 1 ? '' : 's'}`;
  }, [board]);

  if (loading && !board) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-pk-primary" aria-hidden />
        <p className="text-sm text-pk-sub">Cargando pipeline…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-pk-mutedText">
            Embudo comercial
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-pk-ink">
            Pipeline Kanban
          </h1>
          <p className="mt-1 text-sm text-pk-sub">
            Cambia la etapa con el selector de cada tarjeta. {totalLabel}
            {lastUpdated ? ` · ${formatRelativeTime(lastUpdated)}` : null}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={refreshing}
          onClick={() => void load(true)}
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden />
          <span className="ml-1">Actualizar</span>
        </Button>
      </div>

      <Card accent="slate" className="border-pk-border">
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
          <CardDescription>Fuente, modalidad, rango de registro y vencidos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label htmlFor="filter-source">Fuente</Label>
              <select
                id="filter-source"
                value={filters.source ?? 'all'}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    source: event.target.value as LeadSourceDisplay | 'all',
                  }))
                }
                className="w-full rounded-xl border border-pk-border bg-white px-3 py-2 text-sm"
              >
                {SOURCE_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-modality">Modalidad</Label>
              <select
                id="filter-modality"
                value={filters.modality ?? 'all'}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    modality: event.target.value as PipelineFilters['modality'],
                  }))
                }
                className="w-full rounded-xl border border-pk-border bg-white px-3 py-2 text-sm"
              >
                <option value="all">Todas</option>
                {PESKIDS_CLASS_MODALITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-from">Desde</Label>
              <Input
                id="filter-from"
                type="date"
                value={filters.created_from ?? ''}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    created_from: event.target.value || undefined,
                  }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-to">Hasta</Label>
              <Input
                id="filter-to"
                type="date"
                value={filters.created_to ?? ''}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    created_to: event.target.value || undefined,
                  }))
                }
              />
            </div>

            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-pk-ink">
                <input
                  type="checkbox"
                  checked={Boolean(filters.overdue_only)}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      overdue_only: event.target.checked || undefined,
                    }))
                  }
                  className="h-4 w-4 rounded border-pk-border"
                />
                Solo vencidos
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {feedback ? (
        <p className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          {feedback}
        </p>
      ) : null}

      {board ? (
        <div className="snap-x snap-mandatory overflow-x-auto pb-2">
          <div className="flex min-w-max gap-4">
            {PIPELINE_COLUMN_ORDER.map((columnId) => (
              <section
                key={columnId}
                aria-label={PIPELINE_COLUMN_LABELS[columnId]}
                className="flex w-[min(100vw-2rem,18rem)] shrink-0 snap-start flex-col rounded-2xl border border-pk-border bg-pk-muted/40"
              >
                <header className="sticky top-0 z-10 border-b border-pk-border bg-pk-muted/95 px-3 py-3 backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-pk-ink">
                      {PIPELINE_COLUMN_LABELS[columnId]}
                    </h2>
                    <Badge tone="neutral">{board.counts[columnId]}</Badge>
                  </div>
                </header>
                <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto p-3">
                  {board.columns[columnId].length === 0 ? (
                    <p className="rounded-xl border border-dashed border-pk-border bg-white/60 px-3 py-6 text-center text-xs text-pk-sub">
                      Sin tarjetas
                    </p>
                  ) : (
                    board.columns[columnId].map((card) => (
                      <PipelineCard
                        key={card.lead.id}
                        card={card}
                        saving={savingLeadId === card.lead.id}
                        onMove={moveLead}
                      />
                    ))
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
