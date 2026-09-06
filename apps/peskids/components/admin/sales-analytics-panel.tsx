'use client';

import type { DashboardData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SalesAnalyticsPanelProps {
  data: DashboardData;
}

const stageLabels: Record<keyof DashboardData['sales_analytics']['lead_status_counts'], string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  trial: 'En seguimiento',
  enrolled: 'Matriculado',
  active: 'Activo',
  renewal: 'Renovación',
  archived: 'Archivado',
};

function formatAxisLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return new Intl.DateTimeFormat('es-CO', { month: 'short', day: 'numeric' }).format(date);
}

export function SalesAnalyticsPanel({ data }: SalesAnalyticsPanelProps): React.ReactElement {
  const maxDayCount = Math.max(1, ...data.sales_analytics.leads_by_day.map((row) => row.total));
  const maxSyncedCount = Math.max(1, ...data.sales_analytics.leads_by_day.map((row) => row.synced_to_twenty));

  return (
    <section data-admin-section="analytics" className="mb-6">
      <Card accent="slate" className="border-pk-border">
        <CardHeader>
          <CardTitle className="text-base">Analítica de captación</CardTitle>
          <CardDescription>
            Ritmo de interesados, conversión por etapa y tiempo hasta contacto / matrícula.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-pk-border bg-pk-muted/40 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pk-mutedText">
                Conversión actual
              </p>
              <p className="mt-2 text-3xl font-semibold text-pk-ink">
                {data.conversion_rate_pct === null ? '—' : `${data.conversion_rate_pct}%`}
              </p>
              <p className="mt-1 text-xs text-pk-sub">Interesados matriculados / interesados del periodo.</p>
            </div>
            <div className="rounded-2xl border border-pk-border bg-pk-muted/40 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pk-mutedText">
                Primera atención
              </p>
              <p className="mt-2 text-3xl font-semibold text-pk-ink">
                {data.sales_analytics.avg_hours_to_first_followup === null
                  ? '—'
                  : `${data.sales_analytics.avg_hours_to_first_followup} h`}
              </p>
              <p className="mt-1 text-xs text-pk-sub">Promedio desde el registro hasta la primera acción de soporte.</p>
            </div>
            <div className="rounded-2xl border border-pk-border bg-pk-muted/40 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pk-mutedText">
                Tiempo a contacto
              </p>
              <p className="mt-2 text-3xl font-semibold text-pk-ink">
                {data.sales_analytics.avg_hours_to_trial === null
                  ? '—'
                  : `${data.sales_analytics.avg_hours_to_trial} h`}
              </p>
              <p className="mt-1 text-xs text-pk-sub">Promedio desde el registro hasta programar la primera clase.</p>
            </div>
            <div className="rounded-2xl border border-pk-border bg-pk-muted/40 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pk-mutedText">
                Matrículas
              </p>
              <p className="mt-2 text-3xl font-semibold text-pk-ink">
                {data.converted_leads_count}
              </p>
              <p className="mt-1 text-xs text-pk-sub">Leads matriculados dentro del rango seleccionado.</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-pk-border bg-pk-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-pk-ink">Leads por día</p>
                  <p className="text-xs text-pk-sub">Volumen total y cuánto llegó ya sincronizado a Twenty.</p>
                </div>
                <Badge tone="neutral">{data.sales_analytics.leads_by_day.length} días</Badge>
              </div>
              <div className="mt-4 space-y-3">
                {data.sales_analytics.leads_by_day.length > 0 ? (
                  data.sales_analytics.leads_by_day.map((row) => (
                    <div key={row.date} className="grid grid-cols-[84px_1fr_64px] items-center gap-3 text-xs">
                      <span className="text-pk-sub">{formatAxisLabel(row.date)}</span>
                      <div className="h-2 overflow-hidden rounded-full bg-pk-muted">
                        <div
                          className="h-full rounded-full bg-teal-500"
                          style={{ width: `${(row.total / maxDayCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-right font-medium text-pk-ink">{row.total}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-pk-sub">Sin datos para el rango seleccionado.</p>
                )}
              </div>

              <div className="mt-5 rounded-2xl border border-dashed border-pk-border bg-white/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-pk-ink">Sync Twenty por día</p>
                    <p className="text-xs text-pk-sub">Cuántos leads ya quedaron con IDs de Twenty.</p>
                  </div>
                  <Badge tone="green">CTA listo</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {data.sales_analytics.leads_by_day.length > 0 ? (
                    data.sales_analytics.leads_by_day.map((row) => (
                      <div key={`${row.date}-sync`} className="grid grid-cols-[84px_1fr_64px] items-center gap-3 text-xs">
                        <span className="text-pk-sub">{formatAxisLabel(row.date)}</span>
                        <div className="h-2 overflow-hidden rounded-full bg-pk-muted">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${(row.synced_to_twenty / maxSyncedCount) * 100}%` }}
                          />
                        </div>
                        <span className="text-right font-medium text-pk-ink">{row.synced_to_twenty}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-pk-sub">Sin datos para mostrar sync.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-pk-border bg-pk-surface p-4">
                <p className="text-sm font-semibold text-pk-ink">Conversión por etapa</p>
                <div className="mt-3 space-y-2">
                  {(Object.entries(data.sales_analytics.lead_status_counts) as Array<
                    [keyof DashboardData['sales_analytics']['lead_status_counts'], number]
                  >).map(([key, count]) => (
                    <div key={key} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-pk-sub">{stageLabels[key]}</span>
                      <span className="rounded-full bg-pk-muted px-2.5 py-1 text-xs font-semibold text-pk-ink">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-pk-border bg-pk-surface p-4">
                <p className="text-sm font-semibold text-pk-ink">Fuentes</p>
                <div className="mt-3 space-y-2">
                  {data.sales_analytics.source_breakdown.map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-pk-sub">{item.label}</span>
                      <span className="font-semibold text-pk-ink">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-pk-border bg-pk-surface p-4">
                <p className="text-sm font-semibold text-pk-ink">Modalidad y conversión</p>
                <div className="mt-3 space-y-2">
                  {data.sales_analytics.modality_breakdown.map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-pk-sub">{item.label}</span>
                      <span className="text-right font-semibold text-pk-ink">
                        {item.total} leads · {item.enrolled} matriculados ·{' '}
                        {item.conversion_pct === null ? '—' : `${item.conversion_pct}%`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-pk-border bg-white/70 p-4 text-sm text-pk-sub">
                Si no hay datos en un tramo, el panel muestra estado vacío en vez de inventar métricas.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
