'use client';

import { useCallback, useState } from 'react';
import {
  Copy,
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
import { StatCard } from '@/components/admin/stat-card';
import { classModalityLabel } from '@/lib/lead-modality';
import { buildPeskidsReferralLink } from '@/lib/peskids-referral-links';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  enrolled: 'Matriculado',
  archived: 'Archivado',
};

const leadStatusTone: Record<
  DashboardData['new_leads'][number]['status'],
  'amber' | 'violet' | 'green' | 'neutral'
> = {
  new: 'amber',
  contacted: 'violet',
  enrolled: 'green',
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
    enrolled: 'Matriculados',
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
}

export function DashboardStatsGrid({ data, search }: DashboardStatsGridProps): React.ReactElement {
  const [leadStatusFilter, setLeadStatusFilter] = useState<
    'all' | DashboardData['new_leads'][number]['status']
  >('all');
  const [followupStatusFilter, setFollowupStatusFilter] = useState<
    'all' | DashboardData['followups'][number]['status']
  >('all');

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
        title="Leads nuevos"
        description="Captados esta semana"
        value={data.new_leads_count}
        icon={UserPlus}
        accent="teal"
      >
        <div className="mb-3 flex flex-wrap gap-2">
          {(['all', 'new', 'contacted', 'enrolled', 'archived'] as const).map((status) => (
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
