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
type AcademyOpsOwner = 'Opsly' | 'GHL' | 'n8n' | 'Manual';

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
      label: 'Leads',
      status: 'ready',
      owner: 'GHL',
      summary: `${data.new_leads_count} leads nuevos y ${data.converted_leads_count} conversiones registradas.`,
      nextAction: 'Mantener form, tags y pipeline sincronizados.',
      icon: iconMap.leads,
    },
    {
      key: 'families',
      label: 'Familias',
      status: 'ready',
      owner: 'Opsly',
      summary: 'Portal, mensajes y notas privadas ya operan como capa de seguimiento.',
      nextAction: 'Usar el inbox y el portal como único punto de verdad para cada familia.',
      icon: iconMap.families,
    },
    {
      key: 'teachers',
      label: 'Profesores',
      status: 'ready',
      owner: 'Opsly',
      summary: `${data.operations.classes_today} clases hoy y panel docente listo para agenda semanal.`,
      nextAction: 'Asignar profesor por clase y notificar cambios desde Opsly.',
      icon: iconMap.teachers,
    },
    {
      key: 'classes',
      label: 'Clases',
      status: 'ready',
      owner: 'Opsly',
      summary: `${data.operations.enrollments_today} inscripciones hoy y calendario de clases activo.`,
      nextAction: 'Mantener cupos, grupos por edad y sesiones en el dashboard operativo.',
      icon: iconMap.classes,
    },
    {
      key: 'calendar',
      label: 'Calendario',
      status: 'partial',
      owner: 'GHL',
      summary: 'Calendarios GHL + programación propia. Útil para reservas y reprogramaciones.',
      nextAction: 'Confirmar recordatorio 24h y reglas de no-show en el flujo de follow-up.',
      icon: iconMap.calendar,
    },
    {
      key: 'reservations',
      label: 'Reservas',
      status: 'ready',
      owner: 'Opsly',
      summary: 'Clase de prueba, confirmación y rebooking ya viven en el flujo de admisiones.',
      nextAction: 'Enviar reserva a pipeline y seguimiento automático tras cada booking.',
      icon: iconMap.reservations,
    },
    {
      key: 'payments',
      label: 'Pagos',
      status: 'partial',
      owner: 'Opsly',
      summary: `${data.operations.revenue_month_cents / 100} COP en ingresos del mes y pagos pendientes visibles.`,
      nextAction: 'Cerrar la ruta de cobro y renovar suscripciones/facturación.',
      icon: iconMap.payments,
    },
    {
      key: 'automations',
      label: 'Automatizaciones',
      status: 'partial',
      owner: 'n8n',
      summary: 'Workflows críticos viven mejor fuera de GHL: draft → approve → send.',
      nextAction: 'Mantener GHL como disparador y n8n como motor de envío.',
      icon: iconMap.automations,
    },
    {
      key: 'reminders',
      label: 'Recordatorios',
      status: 'partial',
      owner: 'n8n',
      summary: `${data.pending_followups_count} seguimientos abiertos y recordatorios de familias/profesores por cerrar.`,
      nextAction: 'Asegurar recordatorio 24h para familias y agenda diaria para profesores.',
      icon: iconMap.reminders,
    },
    {
      key: 'notifications',
      label: 'Notificaciones',
      status: 'ready',
      owner: 'Opsly',
      summary: 'Alertas internas, inbox y feedback privado ya están conectados al panel.',
      nextAction: 'Usar notificaciones para leads calientes, cambios de clase y fallos de cobro.',
      icon: iconMap.notifications,
    },
    {
      key: 'dashboards',
      label: 'Dashboards',
      status: 'ready',
      owner: 'Opsly',
      summary: 'Leads, conversiones, asistencia, revenue y feedback ya se ven en una sola vista.',
      nextAction: 'Presentar esta vista como mapa operativo en la consultoría.',
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
            Peskids / Academy Ops Map
          </p>
          <h3 className="mt-1 font-display text-2xl font-semibold tracking-tight text-pk-ink">
            Mapa operativo de la academia
          </h3>
          <p className="mt-2 text-sm leading-6 text-pk-sub">
            Esta vista separa lo que vive en Opsly, GHL, n8n y lo manual. Sirve para mostrar la
            operación completa sin prometer automatización donde GHL no la expone por API.
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
                    Dueño: {domain.owner}
                  </span>
                </div>
                <p className="text-sm text-pk-sub">{domain.nextAction}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-dashed border-pk-border bg-pk-muted/40 p-4 text-sm text-pk-sub">
        <span className="font-medium text-pk-ink">Regla operativa:</span> GHL opera el CRM y los
        calendarios, Opsly decide y mide, n8n ejecuta secuencias y envíos, y lo manual queda solo
        donde la API no da authoring confiable.
      </div>
    </section>
  );
}
