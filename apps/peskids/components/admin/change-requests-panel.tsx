'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  MessageSquare,
  RefreshCw,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  CHANGE_REQUEST_STATUSES,
  type ChangeRequestStatus,
} from '@/lib/change-request-ticket';

type ChangeRequest = {
  id: string;
  author_email: string | null;
  body: string;
  category: string | null;
  priority: 'alta' | 'media' | 'baja' | null;
  ai_summary: string | null;
  status: ChangeRequestStatus | string;
  twenty_task_id: string | null;
  operator_notes: string | null;
  linked_pr: string | null;
  linked_issue: string | null;
  agent_ticket: Record<string, unknown> | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  new: 'Nuevo',
  analyzed: 'Analizado',
  task_created: 'Task Twenty',
  triaged: 'Requiere discusión',
  approved: 'Aprobado',
  in_progress: 'En progreso',
  shipped: 'Entregado',
  rejected: 'Rechazado',
  dismissed: 'Descartado',
};

const PRIORITY_OPTIONS = ['', 'alta', 'media', 'baja'] as const;
const CATEGORY_OPTIONS = [
  '',
  'bug',
  'feature',
  'improvement',
  'security',
  'billing',
  'question',
  'other',
] as const;

function statusTone(
  status: string
): 'coral' | 'teal' | 'violet' | 'amber' | 'neutral' {
  switch (status) {
    case 'approved':
    case 'shipped':
      return 'teal';
    case 'rejected':
    case 'dismissed':
      return 'coral';
    case 'triaged':
    case 'in_progress':
      return 'amber';
    case 'analyzed':
    case 'task_created':
      return 'violet';
    default:
      return 'neutral';
  }
}

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ChangeRequestsPanel(): React.ReactElement {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      const qs = params.toString();
      const res = await fetch(`/api/admin/change-requests${qs ? `?${qs}` : ''}`, {
        credentials: 'include',
      });
      const json = (await res.json()) as {
        ok?: boolean;
        requests?: ChangeRequest[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error ?? 'No se pudo cargar la cola');
      }
      const list = json.requests ?? [];
      setRequests(list);
      setNotesDraft((prev) => {
        const next = { ...prev };
        for (const row of list) {
          if (next[row.id] === undefined) {
            next[row.id] = row.operator_notes ?? '';
          }
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, categoryFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchStatus(
    id: string,
    status: ChangeRequestStatus,
    extra: { operator_notes?: string | null } = {}
  ): Promise<void> {
    setBusyId(id);
    setError('');
    try {
      const res = await fetch(`/api/admin/change-requests/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          operator_notes: extra.operator_notes ?? notesDraft[id] ?? null,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? 'No se pudo actualizar');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setBusyId(null);
    }
  }

  async function approve(id: string): Promise<void> {
    setBusyId(id);
    setError('');
    try {
      const res = await fetch(`/api/admin/change-requests/${id}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operator_notes: notesDraft[id]?.trim() ? notesDraft[id].trim() : null,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? 'No se pudo aprobar');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aprobar');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-pk-border px-4 py-4">
        <ClipboardList className="h-5 w-5 shrink-0 text-pk-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold text-pk-ink">Pedidos a Opsly</h1>
          <p className="text-xs text-pk-sub">
            Cola de aprobación humana. La AI solo clasifica — nada se ejecuta aquí.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
          Actualizar
        </Button>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-pk-border bg-pk-muted/40 px-4 py-3">
        <label className="flex items-center gap-1.5 text-xs text-pk-sub">
          Estado
          <select
            className="rounded-md border border-pk-border bg-white px-2 py-1 text-sm text-pk-ink"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos</option>
            {CHANGE_REQUEST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s] ?? s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-pk-sub">
          Prioridad
          <select
            className="rounded-md border border-pk-border bg-white px-2 py-1 text-sm text-pk-ink"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p || 'all'} value={p}>
                {p || 'Todas'}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-pk-sub">
          Categoría
          <select
            className="rounded-md border border-pk-border bg-white px-2 py-1 text-sm text-pk-ink"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c || 'all'} value={c}>
                {c || 'Todas'}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800" role="alert">
          {error}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading && requests.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-pk-sub">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando pedidos…
          </div>
        ) : null}

        {!loading && requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-sm font-medium text-pk-ink">No hay pedidos con estos filtros</p>
            <p className="max-w-sm text-xs text-pk-sub">
              El equipo puede enviar solicitudes desde «Pedir cambios a Opsly» en el chat de
              mejoras.
            </p>
          </div>
        ) : null}

        <ul className="space-y-3">
          {requests.map((row) => {
            const busy = busyId === row.id;
            const canAct =
              row.status === 'new' ||
              row.status === 'analyzed' ||
              row.status === 'task_created' ||
              row.status === 'triaged';

            return (
              <li
                key={row.id}
                className="rounded-xl border border-pk-border bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start gap-2">
                  <Badge tone={statusTone(row.status)}>
                    {STATUS_LABEL[row.status] ?? row.status}
                  </Badge>
                  {row.priority ? (
                    <Badge tone={row.priority === 'alta' ? 'coral' : 'neutral'}>
                      {row.priority}
                    </Badge>
                  ) : null}
                  {row.category ? <Badge tone="violet">{row.category}</Badge> : null}
                  <span className="ml-auto text-xs text-pk-sub">{formatWhen(row.created_at)}</span>
                </div>

                <p className="mt-2 text-sm font-medium text-pk-ink">
                  {row.ai_summary ?? row.body.slice(0, 160)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-xs text-pk-sub">{row.body}</p>
                {row.author_email ? (
                  <p className="mt-1 text-xs text-pk-sub">De: {row.author_email}</p>
                ) : null}

                <label className="mt-3 block text-xs text-pk-sub">
                  Notas del operador
                  <textarea
                    className="mt-1 w-full rounded-md border border-pk-border px-2 py-1.5 text-sm text-pk-ink"
                    rows={2}
                    value={notesDraft[row.id] ?? ''}
                    onChange={(e) =>
                      setNotesDraft((prev) => ({ ...prev, [row.id]: e.target.value }))
                    }
                    disabled={busy}
                  />
                </label>

                {row.agent_ticket ? (
                  <p className="mt-2 text-xs text-teal-700">
                    Ticket de agente generado (sin ejecución automática).
                  </p>
                ) : null}

                {canAct ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() => void approve(row.id)}
                    >
                      {busy ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Aprobar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void patchStatus(row.id, 'triaged')}
                    >
                      <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                      Requiere discusión
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void patchStatus(row.id, 'rejected')}
                    >
                      <X className="mr-1.5 h-3.5 w-3.5" />
                      Rechazar
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
