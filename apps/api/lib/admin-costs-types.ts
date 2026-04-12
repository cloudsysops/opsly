import type { BudgetAlertLevel } from "./billing/budget-thresholds";

/** Vista admin: gasto LLM del mes vs límite (USD), sin wallet prepago. */
export type TenantBudgetSnapshot = {
  readonly tenant_slug: string;
  readonly tenant_name: string;
  readonly current_spend_usd: number;
  readonly limit_usd: number;
  readonly percent_used: number;
  readonly alert_level: BudgetAlertLevel;
  readonly enforcement_skipped: boolean;
  readonly projected_month_end_usd: number;
};

export type LlmBudgetSummary = {
  readonly tenant_count: number;
  readonly tenants_at_warning: number;
  readonly tenants_at_critical: number;
  readonly total_spend_usd: number;
};

export type { BudgetAlertLevel };
