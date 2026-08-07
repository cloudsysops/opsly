'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarClock,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
} from 'lucide-react';
import type { Lead360View as Lead360Payload } from '@/lib/services/lead-360.service';
import type { DashboardData } from '@/lib/types';
import { normalizeLeadSourceLabel } from '@/lib/admin/lead-source-label';
import { classModalityLabel } from '@/lib/lead-modality';
import { buildWhatsAppDeepLink } from '@/lib/integrations/wacrm-admin-links';
import { formatAgeRange } from '@/lib/peskids-domain';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, formatRelativeTime } from '@/lib/utils';
import { LeadEnrollForm } from '@/components/admin/lead-enroll-form'
import { LeadQuickActions } from '@/components/admin/lead-quick-actions'
import { SupportReplyTemplates } from '@/components/admin/support-reply-templates'
import type { AdminLeadStatus } from '@/lib/validation/lead-admin.schema';

type LeadRow = DashboardData['new_leads'][number];

type Lead360ViewProps = {
  leadId: string;
};

type FollowupDraft = {
  type: 'call' | 'email' | 'sms' | 'in-person';
  due_date: string;
  notes: string;
};

const leadStatusLabel: Record<LeadRow['status'], string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  trial: 'En seguimiento',
  enrolled: 'Matriculado',
  active: 'Activo',
  renewal: 'Renovación',
  archived: 'Archivado',
};

const leadStatusTone: Record<
  LeadRow['status'],
  'amber' | 'violet' | 'green' | 'teal' | 'neutral'
> = {
  new: 'amber',
  contacted: 'violet',
  trial: 'teal',
  enrolled: 'green',
  active: 'green',
  renewal: 'teal',
  archived: 'neutral',
};

const adminStatusOptions: AdminLeadStatus[] = [
  'new',
  'contacted',
  'trial',
  'enrolled',
  'archived',
];

const syncLabel: Record<NonNullable<LeadRow['twenty_sync_status']>, string> = {
  synced: 'En CRM',
  warning: 'Sync parcial',
  pending: 'Pendiente CRM',
};

const syncTone: Record<NonNullable<LeadRow['twenty_sync_status']>, 'green' | 'amber' | 'neutral'> =
  {
    synced: 'green',
    warning: 'amber',
    pending: 'neutral',
  };

function toAdminStatus(status: LeadRow['status']): AdminLeadStatus {
  if (adminStatusOptions.includes(status as AdminLeadStatus)) {
    return status as AdminLeadStatus;
  }
  if (status === 'active' || status === 'renewal') {
    return 'enrolled';
  }
  return 'new';
}

function emptyFollowupDraft(): FollowupDraft {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    type: 'call',
    due_date: tomorrow.toISOString().slice(0, 10),
    notes: '',
  };
}

function telHref(phone: string): string {
  return `tel:${phone.replace(/\s+/g, '')}`;
}

function mailtoHref(email: string): string {
  return `mailto:${encodeURIComponent(email)}`;
}

async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const json = (await response.json()) as { error?: string };
    return json.error || fallback;
  } catch {
    return fallback;
  }
}

export function Lead360View({ leadId }: Lead360ViewProps): React.ReactElement {
  const [payload, setPayload] = useState<Lead360Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusDraft, setStatusDraft] = useState<AdminLeadStatus>('new');
  const [notesDraft, setNotesDraft] = useState('');
  const [showFollowupForm, setShowFollowupForm] = useState(false);
  const [followupDraft, setFollowupDraft] = useState<FollowupDraft>(() => emptyFollowupDraft());

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/leads/${leadId}`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error(await readApiError(response, 'No se pudo cargar el interesado'));
      }
      const json = (await response.json()) as Lead360Payload & { ok?: boolean };
      setPayload({
        lead: json.lead,
        followups: json.followups,
        trials: json.trials,
        aging_badge: json.aging_badge,
        timeline: json.timeline,
      });
      setStatusDraft(toAdminStatus(json.lead.status));
      setNotesDraft(json.lead.admin_notes ?? '');
    } catch (err) {
      setPayload(null);
      setError(err instanceof Error ? err.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    void load();
  }, [load]);

  const lead = payload?.lead;
  const whatsappUrl = useMemo(
    () => (lead?.phone ? buildWhatsAppDeepLink(lead.phone) : null),
    [lead?.phone]
  );

  const patchLead = useCallback(
    async (body: { status?: AdminLeadStatus; admin_notes?: string }) => {
      setBusy(true);
      setFeedback('');
      try {
        const response = await fetch(`/api/admin/leads/${leadId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          throw new Error(await readApiError(response, 'No se pudo actualizar'));
        }
        setFeedback('Cambios guardados.');
        await load();
      } catch (err) {
        setFeedback(err instanceof Error ? err.message : 'Error al guardar');
      } finally {
        setBusy(false);
      }
    },
    [leadId, load]
  );

  const handleCreateFollowup = useCallback(async () => {
    if (!followupDraft.due_date) {
      setFeedback('Indica la fecha del seguimiento.');
      return;
    }
    setBusy(true);
    setFeedback('');
    try {
      const response = await fetch('/api/admin/followups', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: leadId,
          contact_type: 'lead',
          type: followupDraft.type,
          due_date: followupDraft.due_date,
          notes: followupDraft.notes.trim() || undefined,
        }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, 'No se pudo crear el seguimiento'));
      }
      setShowFollowupForm(false);
      setFollowupDraft(emptyFollowupDraft());
      setFeedback('Seguimiento creado.');
      await load();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Error al crear seguimiento');
    } finally {
      setBusy(false);
    }
  }, [followupDraft, leadId, load]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-pk-sub">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
        Cargando ficha…
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <p className="text-sm text-rose-700">{error || 'Interesado no encontrado'}</p>
        <Link href="/admin#leads">
          <Button type="button" variant="secondary">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
            Volver a interesados
          </Button>
        </Link>
      </div>
    );
  }

  const canConvert = !['enrolled', 'active', 'renewal', 'archived'].includes(lead.status);

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin#leads"
          className="inline-flex items-center gap-2 text-sm font-medium text-pk-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Interesados
        </Link>
      </div>

      <section className="rounded-3xl border border-pk-border bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-pk-mutedText">
              Ficha 360
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-pk-ink">
              {lead.name}
            </h1>
            <p className="text-sm text-pk-sub">{lead.email}</p>
            {lead.phone ? <p className="text-sm text-pk-sub">{lead.phone}</p> : null}
            {lead.neighborhood ? (
              <p className="text-sm text-pk-sub">Barrio: {lead.neighborhood}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={leadStatusTone[lead.status]}>{leadStatusLabel[lead.status]}</Badge>
            {payload.aging_badge ? (
              <Badge tone={payload.aging_badge.bucket === 'escalation_48h' ? 'coral' : 'amber'}>
                {payload.aging_badge.label}
              </Badge>
            ) : null}
            <Badge tone={syncTone[lead.twenty_sync_status ?? 'pending']}>
              {syncLabel[lead.twenty_sync_status ?? 'pending']}
            </Badge>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone="violet">{normalizeLeadSourceLabel(lead.referral_source)}</Badge>
          <Badge tone="amber">{classModalityLabel(lead.class_modality)}</Badge>
          <Badge tone="teal">{formatAgeRange(lead.grade_interested)}</Badge>
          {lead.created_at ? (
            <Badge tone="neutral">
              Registrado {formatRelativeTime(new Date(lead.created_at))}
            </Badge>
          ) : null}
        </div>

        {(lead.twenty_person_url || lead.twenty_opportunity_url) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {lead.twenty_person_url ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => window.open(lead.twenty_person_url ?? '', '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                <span className="ml-1">Persona en Twenty</span>
              </Button>
            ) : null}
            {lead.twenty_opportunity_url ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  window.open(lead.twenty_opportunity_url ?? '', '_blank', 'noopener,noreferrer')
                }
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                <span className="ml-1">Oportunidad en Twenty</span>
              </Button>
            ) : null}
          </div>
        )}
      </section>

      {/* Quick Actions Panel */}
      <LeadQuickActions
        leadId={leadId}
        currentStatus={lead.status}
        busy={busy}
        onBusyChange={setBusy}
        onFeedback={setFeedback}
        onCompleted={load}
      />

      <SupportReplyTemplates
        leadName={lead.name}
        leadType={lead.lead_type}
        status={lead.status}
        latestTrial={
          payload?.trials.length
            ? {
                teacherName: payload.trials[payload.trials.length - 1].teacher_name,
                scheduledDate: payload.trials[payload.trials.length - 1].scheduled_date,
                scheduledTime: payload.trials[payload.trials.length - 1].scheduled_time,
              }
            : null
        }
      />

      <Card accent="slate" className="border-pk-border">
        <CardHeader>
          <CardTitle className="text-base">Acciones adicionales</CardTitle>
          <CardDescription>Contacto manual y actualización operativa.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {whatsappUrl ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => window.open(whatsappUrl, '_blank', 'noopener,noreferrer')}
              >
                <Phone className="h-4 w-4" aria-hidden />
                <span className="ml-1">Abrir WhatsApp</span>
              </Button>
            ) : null}
            {lead.phone ? (
              <a
                href={telHref(lead.phone)}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-xs font-bold text-pk-sub transition-all hover:bg-pk-muted hover:text-pk-ink"
              >
                <Phone className="h-4 w-4" aria-hidden />
                <span>Llamar</span>
              </a>
            ) : null}
            <a
              href={mailtoHref(lead.email)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-xs font-bold text-pk-sub transition-all hover:bg-pk-muted hover:text-pk-ink"
            >
              <Mail className="h-4 w-4" aria-hidden />
              <span>Correo</span>
            </a>
            {canConvert ? (
              <div className="w-full basis-full">
                <LeadEnrollForm
                  lead={lead}
                  leadId={leadId}
                  busy={busy}
                  onBusyChange={setBusy}
                  onFeedback={setFeedback}
                  onCompleted={load}
                />
              </div>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => setShowFollowupForm((value) => !value)}
            >
              <CalendarClock className="h-4 w-4" aria-hidden />
              <span className="ml-1">Nuevo seguimiento</span>
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="lead-status">Estado</Label>
              <select
                id="lead-status"
                className="mt-1 w-full rounded-xl border border-pk-border bg-white px-3 py-2 text-sm"
                value={statusDraft}
                onChange={(event) => setStatusDraft(event.target.value as AdminLeadStatus)}
              >
                {adminStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {leadStatusLabel[status as LeadRow['status']] ?? status}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="mt-2"
                disabled={busy || statusDraft === toAdminStatus(lead.status)}
                onClick={() => void patchLead({ status: statusDraft })}
              >
                Guardar estado
              </Button>
            </div>
            <div>
              <Label htmlFor="lead-notes">Notas internas</Label>
              <textarea
                id="lead-notes"
                rows={3}
                className="mt-1 w-full rounded-xl border border-pk-border bg-white px-3 py-2 text-sm"
                value={notesDraft}
                onChange={(event) => setNotesDraft(event.target.value)}
                placeholder="Contexto para el equipo…"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="mt-2"
                disabled={busy || notesDraft === (lead.admin_notes ?? '')}
                onClick={() => void patchLead({ admin_notes: notesDraft })}
              >
                Guardar notas
              </Button>
            </div>
          </div>

          {showFollowupForm ? (
            <div className="rounded-2xl border border-pk-border bg-pk-muted/30 p-4">
              <p className="mb-3 text-sm font-medium text-pk-ink">Programar seguimiento</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="followup-type">Tipo</Label>
                  <select
                    id="followup-type"
                    className="mt-1 w-full rounded-xl border border-pk-border bg-white px-3 py-2 text-sm"
                    value={followupDraft.type}
                    onChange={(event) =>
                      setFollowupDraft((current) => ({
                        ...current,
                        type: event.target.value as FollowupDraft['type'],
                      }))
                    }
                  >
                    <option value="call">Llamada</option>
                    <option value="email">Correo</option>
                    <option value="sms">Mensaje</option>
                    <option value="in-person">Visita presencial</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="followup-date">Fecha</Label>
                  <Input
                    id="followup-date"
                    type="date"
                    value={followupDraft.due_date}
                    onChange={(event) =>
                      setFollowupDraft((current) => ({ ...current, due_date: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="mt-3">
                <Label htmlFor="followup-notes">Notas</Label>
                <textarea
                  id="followup-notes"
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-pk-border bg-white px-3 py-2 text-sm"
                  value={followupDraft.notes}
                  onChange={(event) =>
                    setFollowupDraft((current) => ({ ...current, notes: event.target.value }))
                  }
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="mt-3"
                disabled={busy}
                onClick={() => void handleCreateFollowup()}
              >
                Crear seguimiento
              </Button>
            </div>
          ) : null}

          {feedback ? (
            <p
              className={cn(
                'text-sm',
                feedback.includes('Error') || feedback.includes('No se')
                  ? 'text-rose-700'
                  : 'text-teal-700'
              )}
            >
              {feedback}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {lead.admin_notes?.trim() ? (
        <Card accent="slate" className="border-pk-border">
          <CardHeader>
            <CardTitle className="text-base">Notas guardadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-pk-sub">{lead.admin_notes}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card accent="slate" className="border-pk-border">
        <CardHeader>
          <CardTitle className="text-base">Línea de tiempo</CardTitle>
          <CardDescription>Registro, seguimientos y sync CRM.</CardDescription>
        </CardHeader>
        <CardContent>
          {payload.timeline.length > 0 ? (
            <ol className="space-y-3">
              {payload.timeline.map((entry, index) => (
                <li
                  key={`${entry.kind}-${entry.at}-${index}`}
                  className="flex gap-3 rounded-2xl border border-pk-border/80 bg-pk-muted/30 px-3 py-3"
                >
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-pk-primary" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-pk-ink">{entry.label}</p>
                    <p className="text-xs text-pk-sub">
                      {formatRelativeTime(new Date(entry.at))}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-pk-sub">Sin eventos registrados todavía.</p>
          )}
        </CardContent>
      </Card>

      {payload.followups.length > 0 && (
        <Card accent="slate" className="border-pk-border">
          <CardHeader>
            <CardTitle className="text-base">Seguimientos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {payload.followups.map((followup) => (
              <div
                key={followup.id}
                className="rounded-xl border border-pk-border/80 bg-white px-3 py-2 text-sm"
              >
                <p className="font-medium text-pk-ink">{followup.type}</p>
                <p className="text-xs text-pk-sub">
                  {followup.due_date} · {followup.status}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
