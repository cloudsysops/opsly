'use client';

import { useMemo } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  CreditCard,
  GraduationCap,
  Home,
  MessageSquare,
  Megaphone,
  ShieldCheck,
  UserRoundSearch,
  Users,
} from 'lucide-react';
import type { DashboardData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type AcademyOpsStatus = 'ready' | 'partial' | 'manual' | 'blocked';
type AcademyOpsOwner = 'Panel' | 'CRM' | 'Automatización' | 'Manual';

type AcademyDomain = {
  key:
    | 'leads'
    | 'families'
    | 'teachers'
    | 'classes'
    | 'calendar'
    | 'reservations'
    | 'payments'
    | 'automations'
    | 'reminders'
    | 'notifications'
    | 'dashboards';
  label: string;
  status: AcademyOpsStatus;
  owner: AcademyOpsOwner;
  summary: string;
  nextAction: string;
  icon: typeof UserRoundSearch;
};

interface AcademyOpsMapProps {
  data: DashboardData;
}

const statusTone: Record<AcademyOpsStatus, 'green' | 'amber' | 'violet' | 'coral'> = {
  ready: 'green',
  partial: 'amber',
  manual: 'violet',
  blocked: 'coral',
};

const statusLabel: Record<AcademyOpsStatus, string> = {
  ready: 'Listo',
  partial: 'Parcial',
  manual: 'Manual',
  blocked: 'Bloqueado',
};

const iconMap: Record<AcademyDomain['key'], typeof UserRoundSearch> = {
  leads: UserRoundSearch,
  families: Users,
  teachers: GraduationCap,
  classes: CalendarClock,
  calendar: Home,
  reservations: CheckCircle2,
  payments: CreditCard,
  automations: Megaphone,
  reminders: MessageSquare,
  notifications: ShieldCheck,
  dashboards: ShieldCheck,
};

function buildAcademyDomains(data: DashboardData): AcademyDomain[] {
  return [
    {
      key: 'leads',
      label: 'Interesados',
      status: 'ready',
      owner: 'CRM',
      summary: `${data.new_leads_count} interesados nuevos y ${data.converted_leads_count} conversiones registradas.`,
      nextAction: 'Mantener formulario, etiquetas y embudo de admisiones al día.',
      icon: iconMap.leads,
    },
    {
      key: 'families',
      label: 'Familias',
      status: 'ready',
      owner: 'Panel',
      summary: 'Portal, mensajes y notas privadas ya operan como capa de seguimiento.',
      nextAction: 'Usar el inbox y el portal como único punto de verdad para cada familia.',
      icon: iconMap.families,
    },
    {
      key: 'teachers',
      label: 'Profesores',
      status: 'ready',
      owner: 'Panel',
      summary: `${data.operations.classes_today} clases hoy y panel docente listo para agenda semanal.`,
      nextAction: 'Asignar profesor por clase y notificar cambios desde el panel.',
      icon: iconMap.teachers,
    },
    {
      key: 'classes',
      label: 'Clases',
      status: 'ready',
      owner: 'Panel',
      summary: `${data.operations.enrollments_today} inscripciones hoy y calendario de clases activo.`,
      nextAction: 'Mantener cupos, grupos por edad y sesiones en el dashboard operativo.',
      icon: iconMap.classes,
    },
    {
      key: 'calendar',
      label: 'Calendario',
      status: 'partial',
      owner: 'CRM',
      summary: 'Calendarios externos y programación propia. Útil para reservas y reprogramaciones.',
      nextAction: 'Confirmar recordatorio 24h y reglas de no-show en el flujo de seguimiento.',
      icon: iconMap.calendar,
    },
    {
      key: 'reservations',
      label: 'Reservas',
      status: 'ready',
      owner: 'Panel',
      summary: 'Clase de prueba, confirmación y rebooking ya viven en el flujo de admisiones.',
      nextAction: 'Enviar reserva al embudo y seguimiento automático tras cada booking.',
      icon: iconMap.reservations,
    },
    {
      key: 'payments',
      label: 'Pagos',
      status: 'partial',
      owner: 'Panel',
      summary: `${data.operations.revenue_month_cents / 100} COP en ingresos del mes y pagos pendientes visibles.`,
      nextAction: 'Cerrar la ruta de cobro y renovar suscripciones o facturación.',
      icon: iconMap.payments,
    },
    {
      key: 'automations',
      label: 'Automatizaciones',
      status: 'partial',
      owner: 'Automatización',
      summary: 'Secuencias críticas: borrador → aprobación → envío.',
      nextAction: 'Mantener el CRM como disparador y las automatizaciones como motor de envío.',
      icon: iconMap.automations,
    },
    {
      key: 'reminders',
      label: 'Recordatorios',
      status: 'partial',
      owner: 'Automatización',
      summary: `${data.pending_followups_count} seguimientos abiertos y recordatorios de familias o profesores por cerrar.`,
      nextAction: 'Asegurar recordatorio 24h para familias y agenda diaria para profesores.',
      icon: iconMap.reminders,
    },
    {
      key: 'notifications',
      label: 'Notificaciones',
      status: 'ready',
      owner: 'Panel',
      summary: 'Alertas internas, inbox y feedback privado ya están conectados al panel.',
      nextAction: 'Usar notificaciones para interesados calientes, cambios de clase y fallos de cobro.',
      icon: iconMap.notifications,
    },
    {
      key: 'dashboards',
      label: 'Resumen',
      status: 'ready',
      owner: 'Panel',
      summary: 'Interesados, conversiones, asistencia, ingresos y feedback en una sola vista.',
      nextAction: 'Presentar esta vista como mapa operativo en la reunión con el cliente.',
      icon: iconMap.dashboards,
    },
  ];
}

export function AcademyOpsMap({ data }: AcademyOpsMapProps): React.ReactElement {
  const domains = useMemo(() => buildAcademyDomains(data), [data]);
  const totals = useMemo(() => {
    return domains.reduce(
      (acc, domain) => {
        acc[domain.status] += 1;
        return acc;
      },
      { ready: 0, partial: 0, manual: 0, blocked: 0 } as Record<AcademyOpsStatus, number>
    );
  }, [domains]);

  return (
    <section data-admin-section="academy" className="mb-5 rounded-3xl border border-pk-border bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-pk-mutedText">
            Peskids / Operación
          </p>
          <h3 className="mt-1 font-display text-2xl font-semibold tracking-tight text-pk-ink">
            Mapa operativo de la academia
          </h3>
          <p className="mt-2 text-sm leading-6 text-pk-sub">
            Vista de alto nivel para ver qué áreas están listas, en progreso o requieren trabajo
            manual. Sirve para orientar la operación diaria sin entrar en detalle técnico.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-2xl border border-pk-border bg-pk-muted px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.12em] text-pk-mutedText">Listo</p>
            <p className="mt-1 font-semibold text-pk-ink">{totals.ready}</p>
          </div>
          <div className="rounded-2xl border border-pk-border bg-pk-muted px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.12em] text-pk-mutedText">Parcial</p>
            <p className="mt-1 font-semibold text-pk-ink">{totals.partial}</p>
          </div>
          <div className="rounded-2xl border border-pk-border bg-pk-muted px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.12em] text-pk-mutedText">Manual</p>
            <p className="mt-1 font-semibold text-pk-ink">{totals.manual}</p>
          </div>
          <div className="rounded-2xl border border-pk-border bg-pk-muted px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.12em] text-pk-mutedText">Bloqueado</p>
            <p className="mt-1 font-semibold text-pk-ink">{totals.blocked}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {domains.map((domain) => {
          const Icon = domain.icon;
          return (
            <Card key={domain.key} accent={statusTone[domain.status]} className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="h-4 w-4 text-pk-primary" aria-hidden />
                      {domain.label}
                    </CardTitle>
                    <CardDescription className="mt-1">{domain.summary}</CardDescription>
                  </div>
                  <Badge tone={statusTone[domain.status]}>{statusLabel[domain.status]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-2 text-[11px] font-medium">
                  <span className="rounded-full border border-pk-border bg-pk-muted px-2.5 py-1 text-pk-sub">
                    Área: {domain.owner}
                  </span>
                </div>
                <p className="text-sm text-pk-sub">{domain.nextAction}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <details className="mt-5 rounded-2xl border border-dashed border-pk-border bg-pk-muted/40 p-4 text-sm text-pk-sub">
        <summary className="cursor-pointer font-medium text-pk-ink">Vista avanzada (equipo técnico)</summary>
        <p className="mt-3">
          El CRM externo opera contactos y calendarios; el panel Peskids concentra decisiones y
          métricas; las automatizaciones ejecutan secuencias y envíos. Lo manual queda solo donde no
          hay integración confiable.
        </p>
      </details>
    </section>
  );
}
