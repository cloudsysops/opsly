"use client";

import type { ReactNode } from "react";
import type { TenantBudgetSnapshot } from "@/lib/types";

type BudgetAlertCardProps = {
  readonly snapshots: TenantBudgetSnapshot[];
};

export function BudgetAlertCard({ snapshots }: BudgetAlertCardProps): ReactNode {
  const alerts = snapshots.filter(
    (s) => s.alert_level === "warning" || s.alert_level === "critical",
  );

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 space-y-3">
      <h2 className="text-lg font-semibold text-ops-text">
        Alertas de presupuesto LLM (USD)
      </h2>
      {alerts.map((s) => (
        <div
          key={s.tenant_slug}
          className={`flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4 ${
            s.alert_level === "critical"
              ? "border-red-500/40 bg-red-500/10"
              : "border-amber-500/40 bg-amber-500/10"
          }`}
        >
          <div>
            <p
              className={`text-sm font-medium ${
                s.alert_level === "critical" ? "text-red-200" : "text-amber-200"
              }`}
            >
              {s.alert_level === "critical" ? "Crítico: " : "Aviso: "}
              {s.tenant_name} ({s.tenant_slug})
            </p>
            <p className="mt-1 font-mono text-xs text-ops-muted">
              Gasto mes: ${s.current_spend_usd.toFixed(2)} / límite $
              {s.limit_usd.toFixed(2)}
              {s.enforcement_skipped ? " · enforcement omitido" : ""}
            </p>
          </div>
          <span
            className={`font-mono text-2xl font-bold ${
              s.alert_level === "critical" ? "text-red-400" : "text-amber-400"
            }`}
          >
            {s.percent_used.toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
}
