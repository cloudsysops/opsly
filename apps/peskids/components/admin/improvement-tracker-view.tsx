'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ExternalLink,
  Inbox,
  Loader2,
  Send,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ImprovementClientStatus =
  | 'recibido'
  | 'priorizado'
  | 'en_desarrollo'
  | 'listo_para_probar'
  | 'aprobado'
  | 'publicado'
  | 'backlog'
  | 'cerrado';

type ImprovementCategory =
  | 'bug'
  | 'feature'
  | 'improvement'
  | 'security'
  | 'billing'
  | 'question'
  | 'other'
  | null;

type ImprovementRequest = {
  id: string;
  body: string;
  author_email: string | null;
  category: ImprovementCategory;
  priority: 'alta' | 'media' | 'baja' | null;
  ai_summary: string | null;
  twenty_task_id: string | null;
  client_status: ImprovementClientStatus;
  github_issue_url: string | null;
  github_pr_url: string | null;
  preview_url: string | null;
  production_url: string | null;
  operator_notes: string | null;
  ready_for_client_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_LABEL: Record<ImprovementClientStatus, string> = {
  recibido: 'Recibido',
  priorizado: 'Priorizado',
  en_desarrollo: 'En desarrollo',
  listo_para_probar: 'Listo para probar',
  aprobado: 'Aprobado',
  publicado: 'Publicado',
  backlog: 'Backlog',
  cerrado: 'Cerrado',
};

const STATUS_HELP: Record<ImprovementClientStatus, string> = {
  recibido: 'Llegó al equipo de Opsly.',
  priorizado: 'Ya está revisado y ordenado.',
  en_desarrollo: 'Un agente o dev lo está trabajando.',
  listo_para_probar: 'Hay un link para validarlo.',
  aprobado: 'El cliente ya lo aprobó.',
  publicado: 'Ya está en producción.',
  backlog: 'Guardado para una fase posterior.',
  cerrado: 'No requiere más acción.',
};

const STATUS_TONE: Record<
  ImprovementClientStatus,
  'neutral' | 'teal' | 'green' | 'amber' | 'coral' | 'violet'
> = {
  recibido: 'neutral',
  priorizado: 'violet',
  en_desarrollo: 'amber',
  listo_para_probar: 'teal',
  aprobado: 'green',
  publicado: 'green',
  backlog: 'neutral',
  cerrado: 'neutral',
};

const STATUS_ORDER: ImprovementClientStatus[] = [
  'recibido',
  'priorizado',
  'en_desarrollo',
  'listo_para_probar',
  'aprobado',
  'publicado',
  'backlog',
  'cerrado',
];

const CATEGORY_LABEL: Record<Exclude<ImprovementCategory, null>, string> = {
  bug: 'Bug',
  feature: 'Funcionalidad',
  improvement: 'Mejora',
  security: 'Seguridad',
  billing: 'Facturación',
  question: 'Pregunta',
  other: 'Otro',
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function firstLine(text: string): string {
  return text.trim().split('\n')[0]?.slice(0, 160) || 'Solicitud sin título';
}

function LinkPill({
  href,
  label,
  icon: Icon = ExternalLink,
}: {
  href: string | null;
  label: string;
  icon?: typeof ExternalLink;
}): React.ReactElement | null {
  if (!href) return null;
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-pk-border bg-white px-3 py-1 text-xs font-bold text-pk-ink transition hover:border-pk-primary/40 hover:bg-pk-snow"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </Link>
  );
}

function nextStatus(status: ImprovementClientStatus): ImprovementClientStatus {
  switch (status) {
    case 'recibido':
      return 'priorizado';
    case 'priorizado':
      return 'en_desarrollo';
    case 'en_desarrollo':
      return 'listo_para_probar';
    case 'listo_para_probar':
      return 'aprobado';
    case 'aprobado':
      return 'publicado';
    default:
      return status;
  }
}

export function ImprovementTrackerView(): React.ReactElement {
  const [requests, setRequests] = useState<ImprovementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    try {
      setError('');
      const res = await fetch('/api/admin/improvement-chat', { credentials: 'include' });
      if (res.status === 404) {
        setDisabled(true);
        return;
      }
      if (!res.ok) throw new Error('No se pudo cargar el tablero de mejoras.');
      const json = (await res.json()) as { requests?: ImprovementRequest[] };
      setRequests(json.requests ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el tablero de mejoras.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const counts = useMemo(() => {
    return STATUS_ORDER.reduce<Record<ImprovementClientStatus, number>>((acc, status) => {
      acc[status] = requests.filter((request) => request.client_status === status).length;
      return acc;
    }, {} as Record<ImprovementClientStatus, number>);
  }, [requests]);

  const handleCreate = async (): Promise<void> => {
    const body = draft.trim();
    if (body.length < 3 || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/admin/improvement-chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? 'No se pudo crear la mejora.');
      setDraft('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la mejora.');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (
    request: ImprovementRequest,
    client_status: ImprovementClientStatus
  ): Promise<void> => {
    setSavingId(request.id);
    setError('');
    try {
      const res = await fetch('/api/admin/improvement-chat', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: request.id, client_status }),
      });
      const json = (await res.json()) as { error?: string; request?: ImprovementRequest };
      if (!res.ok) throw new Error(json.error ?? 'No se pudo actualizar la mejora.');
      if (json.request) {
        setRequests((prev) => prev.map((item) => (item.id === json.request?.id ? json.request : item)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la mejora.');
    } finally {
      setSavingId(null);
    }
  };

  if (disabled) {
    return (
      <div className="rounded-2xl border border-pk-border bg-white p-8 text-center shadow-card">
        <Sparkles className="mx-auto h-10 w-10 text-pk-primary" aria-hidden />
        <h1 className="mt-3 text-xl font-bold text-pk-ink">Mejoras desactivadas</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-pk-sub">
          Activa <code className="font-mono">PESKIDS_STAFF_IMPROVEMENT_CHAT_ENABLED=true</code>{' '}
          para que Peskids pueda reportar cambios y ver el estado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] bg-pk-deep text-white shadow-hero">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_0.9fr] lg:p-8">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-white/50">
              Mesa de mejoras
            </p>
            <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              Peskids pide cambios, Opsly los organiza y el cliente ve cuándo puede probar.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/72">
              Cada mensaje se convierte en una solicitud con estado visible. Cuando exista un link
              de prueba o producción, queda en la tarjeta para revisión del cliente.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
            <label htmlFor="improvement-request" className="text-sm font-bold text-white">
              Reportar mejora rápida
            </label>
            <textarea
              id="improvement-request"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={4}
              className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/95 p-3 text-sm text-pk-ink outline-none transition focus:border-pk-primary"
              placeholder="Ej: Queremos que al marcar una mejora como lista aparezca un link para probarla."
            />
            <Button
              type="button"
              className="mt-3 bg-pk-sun text-pk-ink hover:brightness-105"
              disabled={sending || draft.trim().length < 3}
              onClick={() => void handleCreate()}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Crear solicitud
            </Button>
          </div>
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        {STATUS_ORDER.slice(0, 6).map((status) => (
          <Card key={status} className="border-pk-border">
            <CardHeader className="pb-2">
              <CardDescription>{STATUS_LABEL[status]}</CardDescription>
              <CardTitle className="text-3xl">{counts[status] ?? 0}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card accent="slate" className="border-pk-border">
        <CardHeader>
          <CardTitle>Solicitudes de Peskids</CardTitle>
          <CardDescription>
            Estado visible para el cliente: recibido, en desarrollo, listo para probar y publicado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-pk-sub">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              Cargando mejoras…
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-pk-border bg-pk-snow p-8 text-center">
              <Inbox className="mx-auto h-8 w-8 text-pk-primary" aria-hidden />
              <p className="mt-3 font-bold text-pk-ink">Aún no hay solicitudes</p>
              <p className="mt-1 text-sm text-pk-sub">
                Usa el formulario de arriba o el chat flotante de “Mejoras”.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => {
                const canAdvance = nextStatus(request.client_status) !== request.client_status;
                return (
                  <article
                    key={request.id}
                    className="rounded-2xl border border-pk-border bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={STATUS_TONE[request.client_status]}>
                            {STATUS_LABEL[request.client_status]}
                          </Badge>
                          {request.category ? (
                            <Badge tone="neutral">{CATEGORY_LABEL[request.category]}</Badge>
                          ) : null}
                          {request.priority ? <Badge tone="amber">Prioridad {request.priority}</Badge> : null}
                          {request.twenty_task_id ? <Badge tone="green">Twenty task</Badge> : null}
                        </div>
                        <h2 className="mt-3 text-lg font-bold text-pk-ink">
                          {request.ai_summary || firstLine(request.body)}
                        </h2>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-pk-sub">
                          {request.body}
                        </p>
                        {request.operator_notes ? (
                          <p className="mt-3 rounded-2xl bg-pk-snow px-3 py-2 text-sm text-pk-ink">
                            <strong>Nota Opsly:</strong> {request.operator_notes}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <LinkPill href={request.github_issue_url} label="Issue" />
                          <LinkPill href={request.github_pr_url} label="PR" />
                          <LinkPill href={request.preview_url} label="Probar cambio" icon={CheckCircle2} />
                          <LinkPill href={request.production_url} label="Producción" />
                        </div>
                      </div>

                      <div className="w-full shrink-0 space-y-2 rounded-2xl bg-pk-snow p-3 lg:w-64">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-pk-mutedText">
                          Estado
                        </p>
                        <select
                          value={request.client_status}
                          disabled={savingId === request.id}
                          onChange={(event) =>
                            void handleStatusChange(
                              request,
                              event.target.value as ImprovementClientStatus
                            )
                          }
                          className="pk-input h-10 w-full text-sm"
                        >
                          {STATUS_ORDER.map((status) => (
                            <option key={status} value={status}>
                              {STATUS_LABEL[status]}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs leading-5 text-pk-mutedText">
                          {STATUS_HELP[request.client_status]}
                        </p>
                        {canAdvance ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            fullWidth
                            disabled={savingId === request.id}
                            onClick={() => void handleStatusChange(request, nextStatus(request.client_status))}
                          >
                            {savingId === request.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : null}
                            Avanzar estado
                          </Button>
                        ) : null}
                        <p className="text-[11px] text-pk-mutedText">
                          Creado {formatDate(request.created_at)}
                          {request.updated_at !== request.created_at
                            ? ` · actualizado ${formatDate(request.updated_at)}`
                            : ''}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
