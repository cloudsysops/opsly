import type { PlanKey } from '../supabase/types';

export const PLAN_SERVICES: Record<PlanKey, readonly string[]> = {
  startup: ['n8n', 'uptime_kuma'],
  business: ['n8n', 'uptime_kuma'],
  enterprise: ['n8n', 'uptime_kuma'],
  demo: ['n8n', 'uptime_kuma'],
};

/** Monthly recurring revenue in USD (list prices), excluding demo tenants. */
export const PLAN_MRR_USD: Record<PlanKey, number> = {
  startup: 49,
  business: 149,
  enterprise: 499,
  demo: 0,
};
