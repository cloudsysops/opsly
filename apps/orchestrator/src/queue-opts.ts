import type { JobsOptions, QueueOptions } from 'bullmq';
import { parseAutonomyRiskLevel, resolveAutonomyPolicy } from './autonomy/policy.js';
import type { OrchestratorJob } from './types.js';

const MAX_JOB_ID_LEN = 128;

/**
 * Polling configuration for reduced Redis query frequency.
 * Default poll: 1000ms → optimized: 3000ms when queue empty
 * Exponential backoff: 3s → 10s max (capped)
 * Expected savings: 5-10% (fewer Redis reads).
 */
export const OPTIMIZED_POLLING_CONFIG: Partial<QueueOptions> = {
  defaultJobOptions: {
    removeOnComplete: true,
  },
  settings: {
    // When no jobs ready: poll every 3s instead of 1s
    maxStalledInterval: 3000,
    maxStalledCount: 2,
    // Exponential backoff for worker retries
    retryProcessDelay: 5000,
  },
};

/**
 * Legacy polling (pre-optimization) for backward compatibility.
 */
export const LEGACY_POLLING_CONFIG: Partial<QueueOptions> = {
  settings: {
    maxStalledInterval: 1000,
    maxStalledCount: 2,
    retryProcessDelay: 3000,
  },
};

/**
 * Prioridad BullMQ: rango 0 (máxima) … 2_097_152 (mínima).
 * Alineado con ADR-011 (planes); menor número = antes en la cola.
 */
export const PLAN_QUEUE_PRIORITY = {
  enterprise: 0,
  business: 10_000,
  startup: 50_000,
} as const;

/**
 * Prioridad de encolado por plan de tenant. Sin `plan` se trata como startup.
 */
export function planToQueuePriority(plan?: OrchestratorJob['plan']): number {
  if (plan === 'enterprise') {
    return PLAN_QUEUE_PRIORITY.enterprise;
  }
  if (plan === 'business') {
    return PLAN_QUEUE_PRIORITY.business;
  }
  return PLAN_QUEUE_PRIORITY.startup;
}

/**
 * BullMQ `jobId` solo acepta caracteres seguros; evita colisiones entre tipos.
 */
export function sanitizeQueueJobId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9:_-]/g, '_');
  return cleaned.length <= MAX_JOB_ID_LEN ? cleaned : cleaned.slice(0, MAX_JOB_ID_LEN);
}

function isPlannerDerivedJob(job: OrchestratorJob): boolean {
  const p = job.payload;
  if (typeof p !== 'object' || p === null) {
    return false;
  }
  return 'planner_tool' in p && typeof (p as { planner_tool?: unknown }).planner_tool === 'string';
}

function isGrowthCritical(job: OrchestratorJob): boolean {
  const metadata = job.metadata;
  if (!metadata) {
    return false;
  }
  const labels = metadata.labels;
  if (!Array.isArray(labels)) {
    return false;
  }
  return labels.includes('growth-critical');
}

/**
 * Jobs generados tras Remote Planner: suben prioridad relativa (BullMQ: menor número = antes).
 */
export function buildQueueAddOptions(job: OrchestratorJob): JobsOptions {
  const riskFromMetadata = parseAutonomyRiskLevel(job.metadata?.autonomy_risk);
  const policy = resolveAutonomyPolicy(job.type, job.autonomy_risk ?? riskFromMetadata);
  const basePriority = planToQueuePriority(job.plan);
  const plannerBoosted = isPlannerDerivedJob(job) ? Math.max(0, basePriority - 5000) : basePriority;
  const growthBoosted = isGrowthCritical(job) ? Math.max(0, plannerBoosted - 15_000) : plannerBoosted;
  const boosted =
    policy.riskLevel === 'high' ? Math.max(0, growthBoosted - 10_000) : growthBoosted;
  const opts: JobsOptions = {
    attempts: policy.maxAttempts,
    backoff: { type: 'exponential', delay: policy.backoffDelayMs },
    priority: boosted,
  };

  if (job.idempotency_key && job.idempotency_key.length > 0) {
    opts.jobId = sanitizeQueueJobId(`idem:${job.type}:${job.idempotency_key}`);
  }

  return opts;
}

/**
 * Get active polling configuration.
 * Uses optimized polling by default (reduces Redis reads by ~30-40%).
 * Can be disabled with ORCHESTRATOR_POLLING_OPTIMIZED=false.
 */
export function getPollingConfig(): Partial<QueueOptions> {
  const optimized = process.env.ORCHESTRATOR_POLLING_OPTIMIZED !== 'false';
  return optimized ? OPTIMIZED_POLLING_CONFIG : LEGACY_POLLING_CONFIG;
}
