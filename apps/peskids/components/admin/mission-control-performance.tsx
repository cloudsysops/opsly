'use client';

import type { DashboardData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MissionControlPerformanceProps {
  data: DashboardData;
}

function StatBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div className="rounded-xl bg-pk-muted p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-pk-sub">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-pk-ink">{value}</p>
    </div>
  );
}

function formatPct(value: number | null): string {
  return value === null ? '—' : `${value}%`;
}

function formatHours(value: number | null): string {
  return value === null ? '—' : `${value} h`;
}

export function MissionControlPerformance({ data }: MissionControlPerformanceProps): React.ReactElement {
  const exec = data.executive;
  const maxFunnel = Math.max(1, ...exec.funnel.map((row) => row.count));

  return (
    <Card accent="slate" className="border-pk-border">
      <CardHeader className="py-4">
        <CardTitle className="text-base">Rendimiento del pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 py-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatBlock label="Interesados nuevos" value={String(exec.kpis.new_leads)} />
          <StatBlock label="Conversión a trial" value={formatPct(exec.kpis.lead_to_trial_pct)} />
          <StatBlock label="Conversión a matrícula" value={formatPct(exec.kpis.trial_to_enroll_pct)} />
          <StatBlock
            label="Tiempo a primer contacto"
            value={formatHours(exec.kpis.avg_hours_to_first_contact)}
          />
        </div>

        {exec.funnel.length > 0 ? (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-pk-mutedText">
              Embudo · {exec.timezone}
            </p>
            <div className="space-y-1.5">
              {exec.funnel.map((row) => (
                <div key={row.stage} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-xs text-pk-sub">{row.label}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-pk-muted">
                    <div
                      className={cn('h-full rounded-full bg-pk-primary')}
                      style={{ width: `${(row.count / maxFunnel) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-pk-ink">
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {exec.kpis.best_source ? (
          <p className="rounded-xl border border-dashed border-pk-border bg-teal-50/50 px-3 py-2 text-xs text-pk-sub">
            Mejor fuente: <span className="font-semibold text-pk-ink">{exec.kpis.best_source.label}</span> ·{' '}
            {exec.kpis.best_source.conversion_pct}% de conversión ({exec.kpis.best_source.sample_size} leads)
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
