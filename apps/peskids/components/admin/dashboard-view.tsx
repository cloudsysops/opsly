'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  CalendarClock,
  Copy,
  Mail,
  MessageSquare,
  Phone,
  Star,
  UserPlus,
  Users,
} from 'lucide-react';
import type { DashboardData } from '@/lib/types';
import { AdminShell } from '@/components/admin/admin-shell';
import { MessageInboxPanel } from '@/components/admin/message-inbox-panel';
import { StatCard } from '@/components/admin/stat-card';
import { classModalityLabel } from '@/lib/lead-modality';
import { buildPeskidsReferralLink } from '@/lib/peskids-referral-links';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FeedbackComposer } from '@/components/feedback/feedback-composer';
import { cn, formatRelativeTime } from '@/lib/utils';

interface DashboardViewProps {
  data: DashboardData;
  lastUpdated: Date;
  range: 'week' | 'month';
  onRangeChange: (range: 'week' | 'month') => void;
  onRefresh: () => void;
  refreshing: boolean;
}

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
  trial: 'Prueba',
  enrolled: 'Matriculado',
  active: 'Activo',
  renewal: 'Renovación',
  archived: 'Archivado',
};

const leadStatusTone: Record<
  DashboardData['new_leads'][number]['status'],
  'amber' | 'violet' | 'green' | 'neutral' | 'teal' | 'coral'
> = {
  new: 'amber',
  contacted: 'violet',
  trial: 'teal',
  enrolled: 'green',
  active: 'green',
  renewal: 'coral',
  archived: 'neutral',
};

const followupTypeLabel: Record<DashboardData['followups'][number]['contact_type'], string> = {
  lead: 'Lead',
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
    trial: 'Prueba',
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

export function DashboardView({
  data,
  lastUpdated,
  range,
  onRangeChange,
  onRefresh,
  refreshing,
}: DashboardViewProps): React.ReactElement {
  const [search, setSearch] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState<
    'all' | DashboardData['new_leads'][number]['status']
  >('all');
  const [followupStatusFilter, setFollowupStatusFilter] = useState<
    'all' | DashboardData['followups'][number]['status']
  >('all');

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.new_leads.filter((l) => {
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
  }, [data.new_leads, leadStatusFilter, search]);

  const filteredFollowups = useMemo(() => {
    return data.followups.filter((followup) => {
      if (followupStatusFilter === 'all') return true;
      return followup.status === followupStatusFilter;
    });
  }, [data.followups, followupStatusFilter]);

  const messageSummary = useMemo(() => {
    return data.recent_messages.reduce(
      (acc, msg) => {
        const status = msg.status ?? 'pending';
        acc[status] = (acc[status] ?? 0) + 1;
        if (status === 'pending') {
          if (msg.conversation_mode === 'support') acc.supportPending += 1;
          else acc.admissionsPending += 1;
        }
        return acc;
      },
      {
        pending: 0,
        approved: 0,
        sent: 0,
        supportPending: 0,
        admissionsPending: 0,
      } as Record<'pending' | 'approved' | 'sent', number> & {
        supportPending: number;
        admissionsPending: number;
      }
    );
  }, [data.recent_messages]);

  const nextAction = useMemo(() => {
    if (messageSummary.supportPending > 0) {
      return {
        title: 'Resolver soporte de familias',
        description: `${messageSummary.supportPending} caso(s) de soporte esperan revisión.`,
        tone: 'coral' as const,
        anchor: 'mensajes',
      };
    }

    if (messageSummary.admissionsPending > 0) {
      return {
        title: 'Responder admisiones pendientes',
        description: `${messageSummary.admissionsPending} conversación(es) esperan revisión.`,
        tone: 'amber' as const,
        anchor: 'mensajes',
      };
    }

    if (data.pending_followups_count > 0) {
      return {
        title: 'Cerrar seguimientos abiertos',
        description: `${data.pending_followups_count} seguimiento(s) siguen en cola.`,
        tone: 'coral' as const,
        anchor: 'seguimientos',
      };
    }

    if (data.new_leads_count > 0) {
      return {
        title: 'Trabajar nuevos leads',
        description: `${data.new_leads_count} lead(s) esperando contacto.`,
        tone: 'teal' as const,
        anchor: 'leads',
      };
    }

    return {
      title: 'Todo al día',
      description: 'No hay acciones urgentes en este momento.',
      tone: 'green' as const,
      anchor: 'inicio',
    };
  }, [
    data.new_leads_count,
    data.pending_followups_count,
    messageSummary.admissionsPending,
    messageSummary.supportPending,
  ]);

  const syncLabel = useMemo(() => formatRelativeTime(lastUpdated), [lastUpdated]);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt('Copia este texto', text);
    }
  }, []);

  const scrollToSection = useCallback((anchor: string) => {
    const target = document.querySelector(`[data-admin-section="${anchor}"]`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <AdminShell lastUpdated={lastUpdated} onRefresh={onRefresh} refreshing={refreshing}>
      <section
        data-admin-section="inicio"
        className="mb-6 overflow-hidden rounded-3xl border border-pk-border bg-gradient-to-br from-white via-white to-teal-50/60 p-5 shadow-card sm:p-6"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-pk-mutedText">
              Peskids / Admin
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-pk-ink sm:text-3xl">
              Operación diaria de familias, leads y soporte.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-pk-sub">
              Un panel para decidir rápido qué atender, qué cerrar y qué seguir hoy.
            </p>

            <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-medium text-pk-sub">
              <span className="rounded-full border border-pk-border bg-pk-muted px-3 py-1">
                Leads nuevos: {data.new_leads_count}
              </span>
              <span className="rounded-full border border-pk-border bg-pk-muted px-3 py-1">
                Estudiantes activos: {data.active_students_count}
              </span>
              <span className="rounded-full border border-pk-border bg-pk-muted px-3 py-1">
                Seguimientos: {data.pending_followups_count}
              </span>
              <span className="rounded-full border border-pk-border bg-pk-muted px-3 py-1">
                Mensajes: {data.recent_messages.length}
              </span>
            </div>
          </div>

          <div className="grid gap-3 lg:min-w-[360px]">
            <div
              className={cn(
                'rounded-2xl border bg-white px-4 py-4 shadow-sm',
                nextAction.tone === 'amber' && 'border-amber-100',
                nextAction.tone === 'coral' && 'border-orange-100',
                nextAction.tone === 'teal' && 'border-teal-100',
                nextAction.tone === 'green' && 'border-emerald-100'
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-pk-mutedText">
                Siguiente acción
              </p>
              <p className="mt-1 text-lg font-semibold tracking-tight text-pk-ink">
                {nextAction.title}
              </p>
              <p className="mt-1 text-sm text-pk-sub">{nextAction.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => scrollToSection(nextAction.anchor)}>
                  Ir a la cola
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void handleCopy(syncLabel)}>
                  <Copy className="h-4 w-4" aria-hidden />
                  <span className="ml-1">Copiar última sync</span>
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-pk-border bg-pk-surface px-4 py-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-pk-mutedText">
                Salud de la semana
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-pk-muted px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-pk-mutedText">
                    Atención
                  </p>
                  <p className="mt-1 text-sm font-semibold text-pk-ink">
                    {messageSummary.supportPending + messageSummary.admissionsPending} pendientes
                  </p>
                </div>
                <div className="rounded-xl bg-pk-muted px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-pk-mutedText">
                    Seguimiento
                  </p>
                  <p className="mt-1 text-sm font-semibold text-pk-ink">
                    {data.pending_followups_count} abiertos
                  </p>
                </div>
                <div className="rounded-xl bg-pk-muted px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-pk-mutedText">
                    Captación
                  </p>
                  <p className="mt-1 text-sm font-semibold text-pk-ink">
                    {data.new_leads_count} leads
                  </p>
                </div>
                <div className="rounded-xl bg-pk-muted px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-pk-mutedText">
                    Soporte
                  </p>
                  <p className="mt-1 text-sm font-semibold text-pk-ink">
                    {messageSummary.supportPending} casos
                  </p>
                </div>
                <div className="rounded-xl bg-pk-muted px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-pk-mutedText">
                    Sincronía
                  </p>
                  <p className="mt-1 text-sm font-semibold text-pk-ink">{syncLabel}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-xs text-pk-sub">
            {messageSummary.supportPending + messageSummary.admissionsPending > 0
              ? 'Atiende soporte de familias primero, luego admisiones, seguimiento y captación.'
              : 'La cola está limpia; revisa leads y seguimientos para mantener el ritmo.'}
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex flex-wrap gap-2">
              {(['week', 'month'] as const).map((item) => (
                <Button
                  key={item}
                  type="button"
                  size="sm"
                  variant={range === item ? 'secondary' : 'ghost'}
                  onClick={() => onRangeChange(item)}
                >
                  {item === 'week' ? 'Esta semana' : 'Este mes'}
                </Button>
              ))}
            </div>
            <label className="w-full lg:max-w-xs">
              <span className="sr-only">Buscar leads</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar leads…"
                className="pk-input"
              />
            </label>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          sectionId="leads"
          title="Leads nuevos"
          description={range === 'week' ? 'Captados esta semana' : 'Captados este mes'}
          value={data.new_leads_count}
          icon={UserPlus}
          accent="teal"
        >
          <div className="mb-3 flex flex-wrap gap-2">
            {(
              [
                'all',
                'new',
                'contacted',
                'trial',
                'enrolled',
                'active',
                'renewal',
                'archived',
              ] as const
            ).map((status) => (
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
                      <Badge tone={leadStatusTone[lead.status]}>
                        {leadStatusLabel[lead.status]}
                      </Badge>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
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
                {search ? 'Sin coincidencias para tu búsqueda.' : 'Sin leads nuevos esta semana.'}
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
                <li
                  key={fb.id}
                  className="border-b border-pk-border/60 pb-3 last:border-0 last:pb-0"
                >
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
          sectionId="seguimientos"
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

        <Card accent="slate" className="md:col-span-2 xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Estado de la semana</CardTitle>
            <CardDescription>Lectura breve de la operación</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-pk-muted p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-pk-sub">CRM</p>
              <p className="mt-1 font-display text-2xl font-bold text-pk-primary">
                {data.new_leads_count}
              </p>
            </div>
            <div className="rounded-xl bg-pk-muted p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-pk-sub">Alertas</p>
              <p className="mt-1 font-display text-2xl font-bold text-pk-coral">
                {data.pending_followups_count}
              </p>
            </div>
            <div className="col-span-2 rounded-xl border border-dashed border-pk-border bg-teal-50/50 p-4 text-sm text-pk-sub">
              Los mensajes y leads llegan desde web, WhatsApp e Instagram. Si algo no aparece,
              revisa la sincronización de canales y el estado operativo del día.
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 xl:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Enviar nota privada</CardTitle>
            <CardDescription>
              Útil para observaciones sensibles o seguimiento puntual que solo debe ver la familia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FeedbackComposer
              title="Nota privada para familia"
              description="Escribe una observación directa para una familia. Los profesores no la verán."
              submitLabel="Guardar nota"
              authorType="staff"
              subjectType="student"
              childNameLabel="Nombre del estudiante"
              parentEmailLabel="Email de la familia"
              parentEmailHidden={false}
              visibility="private"
              audience="family"
              subjectHint="Esta nota se guardará solo para la familia y el equipo de administración."
            />
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
