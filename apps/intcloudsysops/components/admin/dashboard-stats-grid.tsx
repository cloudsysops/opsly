'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Copy,
  Loader2,
  Mail,
  Phone,
  Star,
  UserPlus,
  Users,
  CalendarClock,
  MessageSquare,
  GraduationCap,
  Wallet,
} from 'lucide-react';
import type { DashboardData } from '@/lib/types';
import { normalizeLeadSourceLabel } from '@/lib/admin/lead-source-label';
import { StatCard } from '@/components/admin/stat-card';
import { classModalityLabel, PESKIDS_CLASS_MODALITY_OPTIONS } from '@/lib/lead-modality';
import { buildPeskidsReferralLink } from '@/lib/peskids-referral-links';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageInboxPanel } from '@/components/admin/message-inbox-panel';
import { cn } from '@/lib/utils';

function StarRating({ value }: { value: number }): React.ReactElement {
  return (
    <span className="inline-flex gap-0.5 text-sm" aria-label={`${value} de 5 estrellas`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < value ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
          aria-hidden
        />
      ))}
    </span>
  );
}

const leadStatusLabel: Record<DashboardData['new_leads'][number]['status'], string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  trial: 'Clase de Prueba',
  enrolled: 'Matriculado',
  active: 'Activo',
  renewal: 'Renovación',
  archived: 'Archivado',
};

const leadStatusTone: Record<
  DashboardData['new_leads'][number]['status'],
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

const followupTypeLabel: Record<DashboardData['followups'][number]['contact_type'], string> = {
  lead: 'Interesado',
  student: 'Estudiante',
  parent: 'Familia',
};

const followupStatusLabel: Record<DashboardData['followups'][number]['status'], string> = {
  pending: 'Pendiente',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

const followupStatusTone: Record<
  DashboardData['followups'][number]['status'],
  'amber' | 'green' | 'neutral'
> = {
  pending: 'amber',
  completed: 'green',
  cancelled: 'neutral',
};

const leadStatusFilterLabel: Record<'all' | DashboardData['new_leads'][number]['status'], string> =
  {
    all: 'Todos',
    new: 'Nuevos',
    contacted: 'Contactados',
    trial: 'Clase de Prueba',
    enrolled: 'Matriculados',
    active: 'Activos',
    renewal: 'Renovación',
    archived: 'Archivados',
  };

const followupStatusFilterLabel: Record<
  'all' | DashboardData['followups'][number]['status'],
  string
> = {
  all: 'Todos',
  pending: 'Pendientes',
  completed: 'Completados',
  cancelled: 'Cancelados',
};

function toDigits(value: string): string {
  return value.replace(/\D+/g, '');
}

function mailtoHref(email: string): string {
  return `mailto:${encodeURIComponent(email)}`;
}

function whatsappHref(phone: string): string | null {
  const digits = toDigits(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

function formatCop(cents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

interface DashboardStatsGridProps {
  data: DashboardData;
  search: string;
  onRefresh?: () => void;
}

type LeadRow = DashboardData['new_leads'][number];

async function patchLead(
  leadId: string,
  body: { status?: LeadRow['status']; admin_notes?: string }
): Promise<LeadRow> {
  const response = await fetch(`/api/admin/leads/${leadId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = (await response.json()) as { ok?: boolean; lead?: LeadRow; error?: string };
  if (!response.ok || !json.lead) {
    throw new Error(json.error || 'No se pudo actualizar el interesado');
  }

  return json.lead;
}

function canMarkContacted(status: LeadRow['status']): boolean {
  return !['contacted', 'enrolled', 'archived'].includes(status);
}

function canScheduleTrial(status: LeadRow['status']): boolean {
  return !['enrolled', 'archived'].includes(status);
}

function canConvertToStudent(status: LeadRow['status']): boolean {
  return status !== 'enrolled' && status !== 'archived';
}

type TrialScheduleDraft = {
  scheduled_date: string;
  scheduled_time: string;
  modality: (typeof PESKIDS_CLASS_MODALITY_OPTIONS)[number]['value'];
  teacher_name: string;
  notes: string;
};

function emptyTrialDraft(lead: LeadRow): TrialScheduleDraft {
  return {
    scheduled_date: '',
    scheduled_time: '',
    modality: lead.class_modality ?? 'llanogrande',
    teacher_name: '',
    notes: '',
  };
}

export function DashboardStatsGrid({
  data,
  search,
  onRefresh,
}: DashboardStatsGridProps): React.ReactElement {
  const [leadStatusFilter, setLeadStatusFilter] = useState<
    'all' | DashboardData['new_leads'][number]['status']
  >('all');
  const [followupStatusFilter, setFollowupStatusFilter] = useState<
    'all' | DashboardData['followups'][number]['status']
  >('all');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [leadFeedback, setLeadFeedback] = useState<Record<string, string>>({});
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null);
  const [schedulingLeadId, setSchedulingLeadId] = useState<string | null>(null);
  const [trialDrafts, setTrialDrafts] = useState<Record<string, TrialScheduleDraft>>({});
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);

  useEffect(() => {
    setNoteDrafts((current) => {
      const next = { ...current };
      for (const lead of data.new_leads) {
        if (next[lead.id] === undefined) {
          next[lead.id] = lead.admin_notes ?? '';
        }
      }
      return next;
    });
  }, [data.new_leads]);

  const filteredLeads = data.new_leads.filter((l) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      l.name.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      (l.phone?.toLowerCase().includes(q) ?? false) ||
      (l.neighborhood?.toLowerCase().includes(q) ?? false) ||
      classModalityLabel(l.class_modality).toLowerCase().includes(q);
    const matchesStatus = leadStatusFilter === 'all' || l.status === leadStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredFollowups = data.followups.filter((followup) => {
    if (followupStatusFilter === 'all') return true;
    return followup.status === followupStatusFilter;
  });

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt('Copia este texto', text);
    }
  }, []);

  const handleMarkContacted = useCallback(
    async (leadId: string) => {
      setSavingLeadId(leadId);
      setLeadFeedback((current) => {
        const next = { ...current };
        delete next[leadId];
        return next;
      });
      try {
        await patchLead(leadId, { status: 'contacted' });
        setLeadFeedback((current) => ({
          ...current,
          [leadId]: 'Interesado marcado como contactado.',
        }));
        onRefresh?.();
      } catch {
        setLeadFeedback((current) => ({
          ...current,
          [leadId]: 'No se pudo actualizar el estado. Intenta de nuevo.',
        }));
      } finally {
        setSavingLeadId(null);
      }
    },
    [onRefresh]
  );

  const handleSaveNote = useCallback(
    async (leadId: string) => {
      const adminNotes = noteDrafts[leadId] ?? '';
      setSavingLeadId(leadId);
      setLeadFeedback((current) => {
        const next = { ...current };
        delete next[leadId];
        return next;
      });
      try {
        await patchLead(leadId, { admin_notes: adminNotes });
        setLeadFeedback((current) => ({
          ...current,
          [leadId]: 'Nota guardada.',
        }));
        onRefresh?.();
      } catch {
        setLeadFeedback((current) => ({
          ...current,
          [leadId]: 'No se pudo guardar la nota. Intenta de nuevo.',
        }));
      } finally {
        setSavingLeadId(null);
      }
    },
    [noteDrafts, onRefresh]
  );

  const handleConvertLead = useCallback(
    async (leadId: string) => {
      if (!window.confirm('¿Convertir este interesado en alumno matriculado?')) {
        return;
      }

      setConvertingLeadId(leadId);
      setLeadFeedback((current) => {
        const next = { ...current };
        delete next[leadId];
        return next;
      });

      try {
        const response = await fetch(`/api/admin/leads/${leadId}/convert`, {
          method: 'POST',
          credentials: 'include',
        });
        const json = (await response.json()) as { ok?: boolean; error?: string };
        if (!response.ok) {
          throw new Error(json.error || 'No se pudo convertir el interesado');
        }
        setLeadFeedback((current) => ({
          ...current,
          [leadId]: 'Interesado convertido en alumno.',
        }));
        onRefresh?.();
      } catch {
        setLeadFeedback((current) => ({
          ...current,
          [leadId]: 'No se pudo convertir. Intenta de nuevo.',
        }));
      } finally {
        setConvertingLeadId(null);
      }
    },
    [onRefresh]
  );

  const handleScheduleTrial = useCallback(
    async (lead: LeadRow) => {
      const draft = trialDrafts[lead.id] ?? emptyTrialDraft(lead);
      if (!draft.scheduled_date || !draft.scheduled_time) {
        setLeadFeedback((current) => ({
          ...current,
          [lead.id]: 'Indica fecha y hora para la clase de prueba.',
        }));
        return;
      }

      setSavingLeadId(lead.id);
      setLeadFeedback((current) => {
        const next = { ...current };
        delete next[lead.id];
        return next;
      });

      try {
        const response = await fetch('/api/admin/trial-classes', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: lead.id,
            scheduled_date: draft.scheduled_date,
            scheduled_time: draft.scheduled_time,
            modality: draft.modality,
            teacher_name: draft.teacher_name.trim() || undefined,
            notes: draft.notes.trim() || undefined,
          }),
        });
        const json = (await response.json()) as { ok?: boolean; error?: string };
        if (!response.ok) {
          throw new Error(json.error || 'No se pudo agendar la clase de prueba');
        }
        setSchedulingLeadId(null);
        setLeadFeedback((current) => ({
          ...current,
          [lead.id]: 'Clase de prueba agendada.',
        }));
        onRefresh?.();
      } catch {
        setLeadFeedback((current) => ({
          ...current,
          [lead.id]: 'No se pudo agendar la clase. Intenta de nuevo.',
        }));
      } finally {
        setSavingLeadId(null);
      }
    },
    [onRefresh, trialDrafts]
  );

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      <StatCard
        sectionId="classes"
        title="Clases prueba hoy"
        description="Sesiones programadas"
        value={data.operations.classes_today}
        icon={GraduationCap}
        accent="teal"
      >
        <p className="text-sm text-pk-sub">
          Inscripciones nuevas hoy:{' '}
          <span className="font-semibold text-pk-ink">{data.operations.enrollments_today}</span>
        </p>
        {data.operations.attendance_rate_pct !== null ? (
          <p className="mt-2 text-sm text-pk-sub">
            Asistencia del mes:{' '}
            <span className="font-semibold text-pk-ink">{data.operations.attendance_rate_pct}%</span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-pk-sub">Sin datos de asistencia este mes.</p>
        )}
      </StatCard>

      <StatCard
        sectionId="classes"
        title="Ingresos del mes"
        description="Pagos confirmados vía Stripe"
        value={formatCop(data.operations.revenue_month_cents)}
        icon={Wallet}
        accent="green"
      >
        <p className="text-sm text-pk-sub">
          Pendiente de cobro:{' '}
          <span className="font-semibold text-pk-ink">
            {formatCop(data.operations.pending_payments_cents)}
          </span>
        </p>
      </StatCard>

      <StatCard
        sectionId="leads"
        title="Interesados nuevos"
        description="Captados esta semana"
        value={data.new_leads_count}
        icon={UserPlus}
        accent="teal"
      >
        <div className="mb-3 flex flex-wrap gap-2">
          {(['all', 'new', 'contacted', 'trial', 'enrolled', 'archived'] as const).map((status) => (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={leadStatusFilter === status ? 'secondary' : 'ghost'}
              onClick={() => setLeadStatusFilter(status)}
            >
              {leadStatusFilterLabel[status]}
            </Button>
          ))}
        </div>
        <ul className="max-h-72 space-y-3 overflow-y-auto pr-1">
          {filteredLeads.length > 0 ? (
            filteredLeads.map((lead) => {
              const referralCode = lead.referral_code;
              const phoneHref = lead.phone ? whatsappHref(lead.phone) : null;

              return (
                <li
                  key={lead.id}
                  className="rounded-2xl border border-pk-border/80 bg-pk-muted/40 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-pk-ink">{lead.name}</p>
                      <p className="text-xs text-pk-sub">{lead.email}</p>
                      {lead.phone ? <p className="text-xs text-pk-sub">{lead.phone}</p> : null}
                      {lead.neighborhood ? (
                        <p className="text-xs text-pk-sub">Barrio: {lead.neighborhood}</p>
                      ) : null}
                    </div>
                    <Badge tone={leadStatusTone[lead.status]}>{leadStatusLabel[lead.status]}</Badge>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone="violet">{normalizeLeadSourceLabel(lead.referral_source)}</Badge>
                    <Badge tone="amber">{classModalityLabel(lead.class_modality)}</Badge>
                    <Badge tone="teal">{lead.grade_interested}</Badge>
                    {lead.referral_code ? (
                      <Badge tone="green">Ref {lead.referral_code}</Badge>
                    ) : null}
                    {lead.referred_by_code ? <Badge tone="violet">Recomendado</Badge> : null}
                  </div>

                  {lead.admin_notes ? (
                    <p className="mt-2 rounded-xl border border-dashed border-pk-border bg-white/70 px-3 py-2 text-xs text-pk-sub">
                      {lead.admin_notes}
                    </p>
                  ) : null}

                  {lead.referral_code ? (
                    <div className="mt-2 rounded-xl bg-white/75 px-3 py-2 text-[11px] text-pk-sub">
                      <p className="font-semibold text-pk-ink">Link de recomendación</p>
                      <p className="break-all font-mono text-[10px]">
                        {buildPeskidsReferralLink(lead.referral_code)}
                      </p>
                      {lead.referral_redemptions > 0 ? (
                        <p className="mt-1 text-[11px] text-pk-primary">
                          Descuento acumulado: {lead.referral_redemptions} uso(s) ·{' '}
                          {new Intl.NumberFormat('es-CO', {
                            style: 'currency',
                            currency: 'COP',
                            maximumFractionDigits: 0,
                          }).format((lead.referral_discount_cents ?? 0) / 100)}
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] text-pk-sub">
                          Sin redenciones todavía. Este es el link para compartir.
                        </p>
                      )}
                    </div>
                  ) : null}

                  <div className="mt-3 space-y-2">
                    <label className="block text-[11px] font-medium text-pk-sub" htmlFor={`note-${lead.id}`}>
                      Nota rápida
                    </label>
                    <textarea
                      id={`note-${lead.id}`}
                      value={noteDrafts[lead.id] ?? lead.admin_notes ?? ''}
                      onChange={(event) =>
                        setNoteDrafts((current) => ({
                          ...current,
                          [lead.id]: event.target.value,
                        }))
                      }
                      rows={2}
                      className="w-full rounded-xl border border-pk-border bg-white/80 px-3 py-2 text-xs text-pk-ink"
                      placeholder="Ej. Llamar mañana a las 10:00"
                    />
                    <div className="flex flex-wrap gap-2">
                      {canMarkContacted(lead.status) ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={savingLeadId === lead.id}
                          onClick={() => void handleMarkContacted(lead.id)}
                        >
                          {savingLeadId === lead.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : null}
                          <span className={savingLeadId === lead.id ? 'ml-1' : undefined}>
                            Marcar contactado
                          </span>
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={savingLeadId === lead.id}
                        onClick={() => void handleSaveNote(lead.id)}
                      >
                        Guardar nota
                      </Button>
                      {canScheduleTrial(lead.status) ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={savingLeadId === lead.id || convertingLeadId === lead.id}
                          onClick={() => {
                            setSchedulingLeadId((current) =>
                              current === lead.id ? null : lead.id
                            );
                            setTrialDrafts((current) => ({
                              ...current,
                              [lead.id]: current[lead.id] ?? emptyTrialDraft(lead),
                            }));
                          }}
                        >
                          Agendar clase de prueba
                        </Button>
                      ) : null}
                      {canConvertToStudent(lead.status) ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={savingLeadId === lead.id || convertingLeadId === lead.id}
                          onClick={() => void handleConvertLead(lead.id)}
                        >
                          {convertingLeadId === lead.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : null}
                          <span className={convertingLeadId === lead.id ? 'ml-1' : undefined}>
                            Convertir a alumno
                          </span>
                        </Button>
                      ) : null}
                    </div>
                    {schedulingLeadId === lead.id ? (
                      <div className="mt-2 grid gap-2 rounded-xl border border-pk-border bg-white/90 p-3 md:grid-cols-2">
                        <div>
                          <Label htmlFor={`trial-date-${lead.id}`}>Fecha</Label>
                          <Input
                            id={`trial-date-${lead.id}`}
                            type="date"
                            value={trialDrafts[lead.id]?.scheduled_date ?? ''}
                            onChange={(event) =>
                              setTrialDrafts((current) => ({
                                ...current,
                                [lead.id]: {
                                  ...(current[lead.id] ?? emptyTrialDraft(lead)),
                                  scheduled_date: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor={`trial-time-${lead.id}`}>Hora</Label>
                          <Input
                            id={`trial-time-${lead.id}`}
                            type="time"
                            value={trialDrafts[lead.id]?.scheduled_time ?? ''}
                            onChange={(event) =>
                              setTrialDrafts((current) => ({
                                ...current,
                                [lead.id]: {
                                  ...(current[lead.id] ?? emptyTrialDraft(lead)),
                                  scheduled_time: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor={`trial-modality-${lead.id}`}>Modalidad</Label>
                          <select
                            id={`trial-modality-${lead.id}`}
                            className="flex h-10 w-full rounded-md border border-pk-border bg-white px-3 text-sm"
                            value={trialDrafts[lead.id]?.modality ?? 'llanogrande'}
                            onChange={(event) =>
                              setTrialDrafts((current) => ({
                                ...current,
                                [lead.id]: {
                                  ...(current[lead.id] ?? emptyTrialDraft(lead)),
                                  modality: event.target.value as TrialScheduleDraft['modality'],
                                },
                              }))
                            }
                          >
                            {PESKIDS_CLASS_MODALITY_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label htmlFor={`trial-teacher-${lead.id}`}>Profesor (opcional)</Label>
                          <Input
                            id={`trial-teacher-${lead.id}`}
                            value={trialDrafts[lead.id]?.teacher_name ?? ''}
                            onChange={(event) =>
                              setTrialDrafts((current) => ({
                                ...current,
                                [lead.id]: {
                                  ...(current[lead.id] ?? emptyTrialDraft(lead)),
                                  teacher_name: event.target.value,
                                },
                              }))
                            }
                            placeholder="Nombre del profesor"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor={`trial-notes-${lead.id}`}>Notas (opcional)</Label>
                          <Input
                            id={`trial-notes-${lead.id}`}
                            value={trialDrafts[lead.id]?.notes ?? ''}
                            onChange={(event) =>
                              setTrialDrafts((current) => ({
                                ...current,
                                [lead.id]: {
                                  ...(current[lead.id] ?? emptyTrialDraft(lead)),
                                  notes: event.target.value,
                                },
                              }))
                            }
                            placeholder="Ej. Traer toalla y gorro"
                          />
                        </div>
                        <div className="md:col-span-2 flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={savingLeadId === lead.id}
                            onClick={() => void handleScheduleTrial(lead)}
                          >
                            {savingLeadId === lead.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            ) : (
                              'Confirmar agenda'
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setSchedulingLeadId(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    {leadFeedback[lead.id] ? (
                      <p className="text-xs text-pk-primary">{leadFeedback[lead.id]}</p>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {lead.email ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          window.open(mailtoHref(lead.email), '_blank', 'noopener,noreferrer')
                        }
                      >
                        <Mail className="h-4 w-4" aria-hidden />
                        <span className="ml-1">Correo</span>
                      </Button>
                    ) : null}
                    {phoneHref ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => window.open(phoneHref, '_blank', 'noopener,noreferrer')}
                      >
                        <Phone className="h-4 w-4" aria-hidden />
                        <span className="ml-1">WhatsApp</span>
                      </Button>
                    ) : null}
                    {referralCode ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => void handleCopy(buildPeskidsReferralLink(referralCode))}
                      >
                        <Copy className="h-4 w-4" aria-hidden />
                        <span className="ml-1">Copiar link</span>
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })
          ) : (
            <p className="text-sm text-pk-sub">
              {search ? 'Sin coincidencias para tu búsqueda.' : 'Sin interesados nuevos esta semana.'}
            </p>
          )}
        </ul>
      </StatCard>

      <StatCard
        sectionId="students"
        title="Estudiantes activos"
        description="Matrícula operativa"
        value={data.active_students_count}
        icon={Users}
        accent="green"
      >
        <ul className="space-y-2">
          {Object.entries(data.students_by_grade).length > 0 ? (
            Object.entries(data.students_by_grade).map(([grade, count]) => (
              <li key={grade} className="flex justify-between text-sm">
                <span className="text-pk-sub">Grado {grade}</span>
                <span className="font-semibold tabular-nums text-pk-ink">{count}</span>
              </li>
            ))
          ) : (
            <p className="text-sm text-pk-sub">Aún no hay estudiantes activos registrados.</p>
          )}
        </ul>
      </StatCard>

      <StatCard
        sectionId="feedback"
        title="Feedback reciente"
        description="Voz de familias y profes"
        value={data.recent_feedback.length}
        icon={Star}
        accent="amber"
      >
        <ul className="max-h-52 space-y-3 overflow-y-auto">
          {data.recent_feedback.length > 0 ? (
            data.recent_feedback.map((fb) => (
              <li key={fb.id} className="border-b border-pk-border/60 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-pk-ink">{fb.child_name}</p>
                  <div className="flex items-center gap-2">
                    <Badge tone={fb.visibility === 'private' ? 'violet' : 'green'}>
                      {fb.visibility === 'private' ? 'Privado' : 'Público'}
                    </Badge>
                    <Badge
                      tone={
                        fb.author_type === 'teacher'
                          ? 'violet'
                          : fb.author_type === 'staff'
                            ? 'teal'
                            : 'amber'
                      }
                    >
                      {fb.author_type === 'teacher'
                        ? 'Profesor'
                        : fb.author_type === 'staff'
                          ? 'Equipo'
                          : 'Familia'}
                    </Badge>
                    <StarRating value={fb.rating ?? fb.satisfaction} />
                  </div>
                </div>
                {fb.body || fb.suggestion ? (
                  <p className="mt-1 text-xs italic text-pk-sub line-clamp-2">
                    &quot;{fb.body ?? fb.suggestion}&quot;
                  </p>
                ) : null}
              </li>
            ))
          ) : (
            <p className="text-sm text-pk-sub">Sin comentarios públicos todavía.</p>
          )}
        </ul>
      </StatCard>

      <StatCard
        sectionId="notes"
        title="Notas privadas a familias"
        description="Solo las ve la familia y el equipo"
        value={data.private_family_notes.length}
        icon={Mail}
        accent="violet"
      >
        <ul className="max-h-52 space-y-3 overflow-y-auto">
          {data.private_family_notes.length > 0 ? (
            data.private_family_notes.map((note) => (
              <li key={note.id} className="rounded-2xl border border-pk-border/70 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-pk-ink">{note.child_name}</p>
                  <Badge tone="violet">Privado</Badge>
                </div>
                <p className="mt-1 text-xs text-pk-sub">
                  {note.parent_email || 'Familia sin correo'}
                </p>
                <p className="mt-2 text-sm text-pk-sub line-clamp-2">
                  {note.body ?? note.suggestion ?? 'Sin contenido'}
                </p>
              </li>
            ))
          ) : (
            <p className="text-sm text-pk-sub">No hay notas privadas todavía.</p>
          )}
        </ul>
      </StatCard>

      <StatCard
        sectionId="follow-up"
        title="Seguimientos pendientes"
        description="Acciones por cerrar"
        value={data.pending_followups_count}
        icon={CalendarClock}
        accent="coral"
      >
        <div className="mb-3 flex flex-wrap gap-2">
          {(['all', 'pending', 'completed', 'cancelled'] as const).map((status) => (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={followupStatusFilter === status ? 'secondary' : 'ghost'}
              onClick={() => setFollowupStatusFilter(status)}
            >
              {followupStatusFilterLabel[status]}
            </Button>
          ))}
        </div>
        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {filteredFollowups.length > 0 ? (
            filteredFollowups.map((fu) => (
              <li
                key={fu.id}
                className={cn(
                  'rounded-2xl px-3 py-3 text-xs text-pk-ink',
                  fu.status === 'pending' && 'bg-rose-50/60',
                  fu.status === 'completed' && 'bg-emerald-50/70',
                  fu.status === 'cancelled' && 'bg-slate-100/80'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-semibold uppercase tracking-wide text-pk-coral">
                      {fu.type}
                    </span>
                    <p className="mt-1 text-[11px] text-pk-sub">
                      {followupTypeLabel[fu.contact_type]} · {followupStatusLabel[fu.status]}
                    </p>
                  </div>
                  <Badge tone={followupStatusTone[fu.status]}>
                    {followupStatusLabel[fu.status]}
                  </Badge>
                </div>
                <p className="mt-1 text-pk-sub">
                  Vence {new Date(fu.due_date).toLocaleDateString('es-CO')}
                </p>
                {fu.notes ? <p className="mt-1 text-pk-sub">{fu.notes}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void handleCopy(
                        `Seguimiento ${fu.type} · ${new Date(fu.due_date).toLocaleDateString('es-CO')}${
                          fu.notes ? ` · ${fu.notes}` : ''
                        }`
                      )
                    }
                  >
                    <Copy className="h-4 w-4" aria-hidden />
                    <span className="ml-1">Copiar recordatorio</span>
                  </Button>
                </div>
              </li>
            ))
          ) : (
            <p className="text-sm text-pk-sub">No hay seguimientos para este filtro.</p>
          )}
        </ul>
      </StatCard>

      <StatCard
        sectionId="mensajes"
        title="Mensajes entrantes"
        description="WhatsApp, Instagram y web"
        value={data.recent_messages.length}
        icon={MessageSquare}
        accent="violet"
      >
        <MessageInboxPanel messages={data.recent_messages} />
      </StatCard>
    </div>
  );
}
