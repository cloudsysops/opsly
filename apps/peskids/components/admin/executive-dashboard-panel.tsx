'use client';

import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  TrendingUp,
} from 'lucide-react';
import type { DashboardData } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatRelativeTime } from '@/lib/utils';

interface ExecutiveDashboardPanelProps {
  data: DashboardData;
  range: 'week' | 'month';
}

function formatPct(value: number | null): string {
  return value === null ? '—' : `${value}%`;
}

function formatHours(value: number | null): string {
  return value === null ? '—' : `${value} h`;
}

const toneBorder: Record<
  DashboardData['executive']['priority_tasks'][number]['tone'],
  string
> = {
  coral: 'border-orange-200 bg-orange-50/70',
  amber: 'border-amber-200 bg-amber-50/70',
  teal: 'border-teal-200 bg-teal-50/70',
  green: 'border-emerald-200 bg-emerald-50/70',
};

export function ExecutiveDashboardPanel({
  data,
  range,
}: ExecutiveDashboardPanelProps): React.ReactElement {
  const exec = data.executive;
  const maxFunnel = Math.max(1, ...exec.funnel.map((row) => row.count));

  return (
    <section data-admin-section="executive" className="mb-6 space-y-4">
      <Card accent="slate" className="border-pk-border">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pk-mutedText">
                Dashboard ejecutivo · {exec.timezone}
              </p>
              <CardTitle className="mt-1 text-xl">
                {exec.greeting}. Esto es lo prioritario hoy.
              </CardTitle>
              <CardDescription className="mt-1">{exec.summary_line}</CardDescription>
            </div>
            <Badge tone="neutral">
              Rango: {range === 'week' ? 'semana' : 'mes'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <Kpi label="Interesados nuevos" value={String(exec.kpis.new_leads)} />
            <Kpi
              label="Sin contactar"
              value={String(exec.kpis.uncontacted)}
              highlight={exec.kpis.uncontacted > 0}
            />
            <Kpi
              label="Seguimientos vencidos"
              value={String(exec.kpis.overdue_followups)}
              highlight={exec.kpis.overdue_followups > 0}
            />
            <Kpi label="Trials hoy" value={String(exec.kpis.trials_today)} />
            <Kpi label="Trials semana" value={String(exec.kpis.trials_this_week)} />
            <Kpi label="Matrículas del mes" value={String(exec.kpis.enrollments_this_month)} />
            <Kpi label="Lead → trial" value={formatPct(exec.kpis.lead_to_trial_pct)} />
            <Kpi label="Trial → matrícula" value={formatPct(exec.kpis.trial_to_enroll_pct)} />
            <Kpi label="1.er contacto" value={formatHours(exec.kpis.avg_hours_to_first_contact)} />
            <Kpi
              label="Mejor fuente"
              value={
                exec.kpis.best_source
                  ? `${exec.kpis.best_source.label} ${exec.kpis.best_source.conversion_pct}%`
                  : '—'
              }
              hint={
                exec.kpis.best_source
                  ? `n=${exec.kpis.best_source.sample_size}`
                  : 'Mínimo 2 leads por fuente'
              }
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-pk-border bg-pk-surface p-4">
              <div className="mb-3 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-pk-primary" aria-hidden />
                <p className="text-sm font-semibold text-pk-ink">Tareas prioritarias</p>
              </div>
              {exec.priority_tasks.length === 0 ? (
                <EmptyState text="Sin tareas prioritarias." />
              ) : (
                <ul className="space-y-2">
                  {exec.priority_tasks.map((task) => (
                    <li
                      key={task.id}
                      className={cn('rounded-xl border px-3 py-3', toneBorder[task.tone])}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-pk-ink">
                            {task.priority}. {task.title}
                          </p>
                          <p className="mt-0.5 text-xs text-pk-sub">{task.detail}</p>
                        </div>
                        <Link
                          href={task.href}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-pk-primary hover:bg-white/70"
                        >
                          Ir
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div
              data-admin-section="agenda"
              className="rounded-2xl border border-pk-border bg-pk-surface p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-pk-primary" aria-hidden />
                <p className="text-sm font-semibold text-pk-ink">Agenda de hoy</p>
              </div>
              {exec.agenda_today.length === 0 ? (
                <EmptyState text="Sin trials ni seguimientos para hoy." />
              ) : (
                <ul className="space-y-2">
                  {exec.agenda_today.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className="flex items-center justify-between gap-3 rounded-xl border border-pk-border bg-white px-3 py-2 text-sm hover:border-teal-200"
                      >
                        <span className="min-w-0 truncate text-pk-ink">{item.title}</span>
                        <span className="shrink-0 text-xs font-medium text-pk-sub">
                          {item.time_label}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
            <div className="rounded-2xl border border-pk-border bg-pk-surface p-4">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-pk-primary" aria-hidden />
                <p className="text-sm font-semibold text-pk-ink">Embudo</p>
              </div>
              <div className="space-y-2">
                {exec.funnel.map((row) => (
                  <div
                    key={row.stage}
                    className="grid grid-cols-[96px_1fr_36px] items-center gap-2 text-xs"
                  >
                    <span className="text-pk-sub">{row.label}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-pk-muted">
                      <div
                        className="h-full rounded-full bg-teal-500"
                        style={{ width: `${Math.round((row.count / maxFunnel) * 100)}%` }}
                      />
                    </div>
                    <span className="text-right font-semibold text-pk-ink">{row.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-pk-border bg-pk-surface p-4">
              <p className="mb-3 text-sm font-semibold text-pk-ink">Actividad reciente</p>
              {exec.recent_activity.length === 0 ? (
                <EmptyState text="Sin actividad reciente en el periodo." />
              ) : (
                <ul className="space-y-2">
                  {exec.recent_activity.map((item) => {
                    const relative = formatRelativeTime(new Date(item.at));
                    const body = (
                      <>
                        <p className="font-medium text-pk-ink">{item.label}</p>
                        <p className="text-pk-sub">{relative}</p>
                      </>
                    );
                    return (
                      <li key={item.id} className="text-xs">
                        {item.href ? (
                          <Link
                            href={item.href}
                            className="block rounded-lg px-1 py-1 hover:bg-pk-muted/60"
                          >
                            {body}
                          </Link>
                        ) : (
                          <div className="px-1 py-1">{body}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-pk-border bg-pk-surface p-4">
                <div className="mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden />
                  <p className="text-sm font-semibold text-pk-ink">Integraciones</p>
                </div>
                {exec.integration_issues.length === 0 ? (
                  <div className="flex items-start gap-2 text-xs text-pk-sub">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden />
                    <span>Sin alertas de Twenty/n8n en este chequeo.</span>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {exec.integration_issues.map((issue) => (
                      <li
                        key={`${issue.label}-${issue.status}`}
                        className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs"
                      >
                        <p className="font-semibold text-pk-ink">
                          {issue.label} · {issue.status}
                        </p>
                        <p className="mt-0.5 text-pk-sub">{issue.detail}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border border-pk-border bg-pk-surface p-4">
                <p className="mb-3 text-sm font-semibold text-pk-ink">Acciones recomendadas</p>
                <p className="mb-2 text-[11px] text-pk-mutedText">
                  Reglas operativas — no IA autónoma.
                </p>
                <ul className="space-y-2">
                  {exec.recommended_actions.map((action) => (
                    <li key={action.title}>
                      <Link
                        href={action.href}
                        className="block rounded-xl border border-pk-border bg-white px-3 py-2 hover:border-teal-200"
                      >
                        <span className="block text-sm font-semibold text-pk-ink">{action.title}</span>
                        <span className="mt-0.5 block text-xs text-pk-sub">{action.detail}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function Kpi({
  label,
  value,
  hint,
  highlight = false,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}): React.ReactElement {
  return (
    <div
      className={cn(
        'rounded-2xl border px-3 py-3',
        highlight ? 'border-amber-200 bg-amber-50/80' : 'border-pk-border bg-pk-muted/40'
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-pk-mutedText">
        {label}
      </p>
      <p className="mt-1 truncate text-xl font-semibold tracking-tight text-pk-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-pk-sub">{hint}</p> : null}
    </div>
  );
}

function EmptyState({ text }: { text: string }): React.ReactElement {
  return <p className="text-xs text-pk-sub">{text}</p>;
}
