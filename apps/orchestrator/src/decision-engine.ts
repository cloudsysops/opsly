import type { OrchestratorJob } from './types.js';

export type TenantPlan = 'startup' | 'business' | 'enterprise' | 'free';

/** Plan limits: max concurrent jobs + budget per hour. */
const PLAN_LIMITS = {
  free: { maxConcurrentJobs: 2, hourlyBudgetUSD: 1.0, maxJobsPerHour: 10 },
  startup: { maxConcurrentJobs: 5, hourlyBudgetUSD: 10.0, maxJobsPerHour: 50 },
  business: { maxConcurrentJobs: 20, hourlyBudgetUSD: 50.0, maxJobsPerHour: 200 },
  enterprise: { maxConcurrentJobs: 100, hourlyBudgetUSD: 500.0, maxJobsPerHour: 1000 },
};

export interface TenantState {
  tenant_slug: string;
  plan: TenantPlan;
  current_concurrent_jobs: number;
  hourly_job_count: number;
  hourly_cost_usd: number;
  last_hour_reset_at: number; // unix timestamp
}

export interface DecisionResult {
  allowed: boolean;
  reason?: string;
  priority?: 'low' | 'normal' | 'high';
  estimatedQueueDelayMs?: number;
}

/**
 * Check if a job should be allowed based on tenant plan limits.
 * Returns decision + recommended priority.
 */
export async function evaluateTenantJobAllowed(
  job: OrchestratorJob,
  state: TenantState
): Promise<DecisionResult> {
  const limits = PLAN_LIMITS[state.plan] || PLAN_LIMITS.free;
  const now = Date.now();
  const hourAgo = now - 3600 * 1000;

  // Reset hourly counters if hour has passed
  const needsReset = state.last_hour_reset_at < hourAgo;
  if (needsReset) {
    state.hourly_job_count = 0;
    state.hourly_cost_usd = 0;
    state.last_hour_reset_at = now;
  }

  // Check concurrent job limit
  if (state.current_concurrent_jobs >= limits.maxConcurrentJobs) {
    return {
      allowed: false,
      reason: `Tenant ${job.tenant_slug} at max concurrent jobs (${limits.maxConcurrentJobs})`,
      priority: 'low',
      estimatedQueueDelayMs: 30000, // Queue and retry in 30s
    };
  }

  // Check hourly job count limit
  if (state.hourly_job_count >= limits.maxJobsPerHour) {
    return {
      allowed: false,
      reason: `Tenant ${job.tenant_slug} exceeded hourly job limit (${limits.maxJobsPerHour}/hr)`,
      priority: 'low',
      estimatedQueueDelayMs: 60000,
    };
  }

  // Check hourly budget
  const estimatedJobCost = job.cost_budget_usd ?? 0.5; // default 0.5 USD if not specified
  if (state.hourly_cost_usd + estimatedJobCost > limits.hourlyBudgetUSD) {
    return {
      allowed: false,
      reason: `Tenant ${job.tenant_slug} would exceed hourly budget ($${limits.hourlyBudgetUSD}/hr)`,
      priority: 'low',
      estimatedQueueDelayMs: 60000,
    };
  }

  // Determine priority based on remaining capacity
  const concurrencyRatio = (state.current_concurrent_jobs + 1) / limits.maxConcurrentJobs;
  const priority =
    concurrencyRatio > 0.8 ? 'low' : concurrencyRatio > 0.5 ? 'normal' : 'high';

  return {
    allowed: true,
    priority,
    reason: `Allowed for tenant ${job.tenant_slug} (plan: ${state.plan})`,
  };
}

/**
 * Get limits for a tenant plan.
 */
export function getTenantPlanLimits(plan: TenantPlan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

/**
 * Estimate queue wait time based on tenant state and job priority.
 */
export function estimateQueueWaitMs(
  state: TenantState,
  priority: 'low' | 'normal' | 'high'
): number {
  const limits = PLAN_LIMITS[state.plan] || PLAN_LIMITS.free;
  const utilizationRatio = state.current_concurrent_jobs / limits.maxConcurrentJobs;

  // Base wait time scales with utilization
  const baseWait = utilizationRatio < 0.5 ? 100 : utilizationRatio < 0.8 ? 500 : 2000;

  // Priority multiplier
  const priorityMultiplier = priority === 'high' ? 0.5 : priority === 'normal' ? 1 : 3;

  return Math.round(baseWait * priorityMultiplier);
}
