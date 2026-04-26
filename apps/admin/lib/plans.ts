import type { PlanKey } from './types';

export const PLAN_MRR_USD: Record<PlanKey, number> = {
  startup: 49,
  business: 149,
  enterprise: 499,
  demo: 0,
};

export const PLAN_PORT_BASE: Record<Exclude<PlanKey, 'demo'>, number> = {
  startup: 8000,
  business: 9000,
  enterprise: 10000,
};

export function mrrForPlan(plan: PlanKey, isDemo: boolean | null): number {
  if (isDemo) {
    return 0;
  }
  return PLAN_MRR_USD[plan] ?? 0;
}
