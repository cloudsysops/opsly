"use client";

import type { ReactNode } from "react";
import type { TenantBudgetSnapshot } from "@/lib/types";

type TenantBudgetBarsProps = {
  readonly snapshots: TenantBudgetSnapshot[];
};

function barColor(s: TenantBudgetSnapshot): string {
  if (s.enforcement_skipped) {
    return "bg-slate-500";
  }
  if (s.alert_level === "critical") {
    return "bg-red-500";
  }
  if (s.alert_level === "warning") {
    return "bg-amber-500";
  }
  return "bg-emerald-500";
}

export function TenantBudgetBars({ snapshots }: TenantBudgetBarsProps): ReactNode {
  if (snapshots.length === 0) {
    return (
      <div className="rounded-lg border border-ops-border bg-ops-card p-6">
        <p className="text-sm text-ops-muted">
          No hay datos de presupuesto por tenant (o Supabase no disponible).
        </p>
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
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium text-ops-text">{s.tenant_name}</span>
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
            <p className="mt-1 font-mono text-xs text-ops-muted">
              Proyección fin de mes: ~${s.projected_month_end_usd.toFixed(2)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
