'use client';

import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import type { TenantBudgetSnapshot } from '@/lib/types';

type BudgetAlertCardProps = {
  readonly snapshots: TenantBudgetSnapshot[];
};

export function BudgetAlertCard({ snapshots }: BudgetAlertCardProps): ReactNode {
  const alerts = snapshots.filter(
    (s) => s.alert_level === 'warning' || s.alert_level === 'critical'
  );
  const criticalCount = alerts.filter((s) => s.alert_level === 'critical').length;
  const warningCount = alerts.length - criticalCount;

  if (alerts.length === 0) {
    return (
      <div className="mb-8 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-emerald-100">Alertas de presupuesto LLM</h2>
            <p className="mt-1 text-sm text-emerald-200/80">
              No hay tenants en warning ni en critical en la vista actual.
            </p>
          </div>
          <Badge variant="green">Sin alertas</Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-lg border border-ops-border bg-ops-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ops-text">Alertas de presupuesto LLM (USD)</h2>
          <p className="mt-1 text-sm text-ops-muted">
            {alerts.length} tenant{alerts.length === 1 ? '' : 's'} requieren revisión por consumo o
            proyección.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {criticalCount > 0 ? <Badge variant="red">Críticos: {criticalCount}</Badge> : null}
          {warningCount > 0 ? <Badge variant="yellow">Avisos: {warningCount}</Badge> : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
        {alerts.map((s) => (
          <div
            key={s.tenant_slug}
            className={`rounded-lg border p-4 ${
              s.alert_level === 'critical'
                ? 'border-red-500/40 bg-red-500/10'
                : 'border-amber-500/40 bg-amber-500/10'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p
                  className={`text-sm font-medium ${
                    s.alert_level === 'critical' ? 'text-red-200' : 'text-amber-200'
                  }`}
                >
                  {s.tenant_name}
                </p>
                <p className="font-mono text-xs text-ops-muted">{s.tenant_slug}</p>
              </div>
              <span
                className={`font-mono text-2xl font-bold ${
                  s.alert_level === 'critical' ? 'text-red-400' : 'text-amber-400'
                }`}
              >
                {s.percent_used.toFixed(0)}%
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant={s.alert_level === 'critical' ? 'red' : 'yellow'}>
                {s.alert_level === 'critical' ? 'Critical' : 'Warning'}
              </Badge>
              {s.enforcement_skipped ? <Badge variant="gray">Enforcement omitido</Badge> : null}
              {s.projected_month_end_usd > s.limit_usd ? (
                <Badge variant="blue">Proyección: ${s.projected_month_end_usd.toFixed(2)}</Badge>
              ) : null}
            </div>

            <p className="mt-3 font-mono text-xs text-ops-muted">
              Gasto mes: ${s.current_spend_usd.toFixed(2)} / límite ${s.limit_usd.toFixed(2)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
