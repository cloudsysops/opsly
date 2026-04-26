'use client';

import type { ReactNode } from 'react';
import type { LlmBudgetSummary } from '@/lib/types';

type LlmBudgetSummaryStripProps = {
  readonly summary: LlmBudgetSummary;
};

export function LlmBudgetSummaryStrip({ summary }: LlmBudgetSummaryStripProps): ReactNode {
  return (
    <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
      <div className="rounded-lg border border-ops-border bg-ops-card p-4">
        <p className="text-sm text-ops-muted">Gasto LLM (mes, suma tenants)</p>
        <p className="font-mono text-2xl font-bold text-ops-text">
          ${summary.total_spend_usd.toFixed(2)}
        </p>
      </div>
      <div className="rounded-lg border border-ops-border bg-ops-card p-4">
        <p className="text-sm text-ops-muted">Tenants en vista</p>
        <p className="font-mono text-2xl font-bold text-ops-text">{summary.tenant_count}</p>
      </div>
      <div className="rounded-lg border border-ops-border bg-ops-card p-4">
        <p className="text-sm text-ops-muted">≥75% presupuesto</p>
        <p className="font-mono text-2xl font-bold text-amber-400">{summary.tenants_at_warning}</p>
      </div>
      <div className="rounded-lg border border-ops-border bg-ops-card p-4">
        <p className="text-sm text-ops-muted">≥90% presupuesto</p>
        <p className="font-mono text-2xl font-bold text-red-400">{summary.tenants_at_critical}</p>
      </div>
    </div>
  );
}
