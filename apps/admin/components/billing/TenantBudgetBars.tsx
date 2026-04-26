'use client';

import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import type { TenantBudgetSnapshot } from '@/lib/types';

type TenantBudgetBarsProps = {
  readonly snapshots: TenantBudgetSnapshot[];
};

function barColor(s: TenantBudgetSnapshot): string {
  if (s.enforcement_skipped) {
    return 'bg-slate-500';
  }
  if (s.alert_level === 'critical') {
    return 'bg-red-500';
  }
  if (s.alert_level === 'warning') {
    return 'bg-amber-500';
  }
  return 'bg-emerald-500';
}

function alertVariant(snapshot: TenantBudgetSnapshot): 'green' | 'yellow' | 'red' | 'gray' {
  if (snapshot.enforcement_skipped) {
    return 'gray';
  }
  if (snapshot.alert_level === 'critical') {
    return 'red';
  }
  if (snapshot.alert_level === 'warning') {
    return 'yellow';
  }
  return 'green';
}

function alertLabel(snapshot: TenantBudgetSnapshot): string {
  if (snapshot.enforcement_skipped) {
    return 'Enforcement omitido';
  }
  if (snapshot.alert_level === 'critical') {
    return 'Critical';
  }
  if (snapshot.alert_level === 'warning') {
    return 'Warning';
  }
  return 'OK';
}

export function TenantBudgetBars({ snapshots }: TenantBudgetBarsProps): ReactNode {
  if (snapshots.length === 0) {
    return (
      <div className="rounded-lg border border-ops-border bg-ops-card p-6">
        <p className="text-sm text-ops-muted">No hay tenants que coincidan con el filtro actual.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-ops-border bg-ops-card">
      <div className="border-b border-ops-border p-4">
        <h2 className="font-semibold text-ops-text">Uso vs límite mensual (USD)</h2>
        <p className="mt-1 text-xs text-ops-muted">
          Proyección fin de mes: lineal sobre gasto acumulado en el mes UTC (orientativa).
        </p>
      </div>
      <ul className="divide-y divide-ops-border">
        {snapshots.map((s) => (
          <li key={s.tenant_slug} className="p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ops-text">{s.tenant_name}</span>
                  <Badge variant={alertVariant(s)}>{alertLabel(s)}</Badge>
                  {s.projected_month_end_usd > s.limit_usd ? (
                    <Badge variant="blue">Proyección supera límite</Badge>
                  ) : null}
                </div>
                <p className="mt-1 font-mono text-xs text-ops-muted">{s.tenant_slug}</p>
              </div>
              <span className="font-mono text-sm text-ops-muted">
                ${s.current_spend_usd.toFixed(2)} / ${s.limit_usd.toFixed(2)} (
                {s.percent_used.toFixed(0)}%)
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ops-border">
              <div
                className={`h-full rounded-full transition-all ${barColor(s)}`}
                style={{ width: `${Math.min(100, s.percent_used)}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-ops-muted">
              <p>Proyección fin de mes: ~${s.projected_month_end_usd.toFixed(2)}</p>
              <p>
                {s.projected_month_end_usd > s.limit_usd
                  ? `Exceso estimado: +$${(s.projected_month_end_usd - s.limit_usd).toFixed(2)}`
                  : `Margen restante: $${Math.max(0, s.limit_usd - s.current_spend_usd).toFixed(2)}`}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
