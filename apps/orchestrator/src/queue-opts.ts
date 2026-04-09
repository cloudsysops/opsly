import type { JobsOptions } from "bullmq";
import type { OrchestratorJob } from "./types.js";

const MAX_JOB_ID_LEN = 128;

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
export function planToQueuePriority(plan?: OrchestratorJob["plan"]): number {
  if (plan === "enterprise") {
    return PLAN_QUEUE_PRIORITY.enterprise;
  }
  if (plan === "business") {
    return PLAN_QUEUE_PRIORITY.business;
  }
  return PLAN_QUEUE_PRIORITY.startup;
}

/**
 * BullMQ `jobId` solo acepta caracteres seguros; evita colisiones entre tipos.
 */
export function sanitizeQueueJobId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9:_-]/g, "_");
  return cleaned.length <= MAX_JOB_ID_LEN ? cleaned : cleaned.slice(0, MAX_JOB_ID_LEN);
}

function isPlannerDerivedJob(job: OrchestratorJob): boolean {
  const p = job.payload;
  if (typeof p !== "object" || p === null) {
    return false;
  }
  return "planner_tool" in p && typeof (p as { planner_tool?: unknown }).planner_tool === "string";
}

/**
 * Jobs generados tras Remote Planner: suben prioridad relativa (BullMQ: menor número = antes).
 */
export function buildQueueAddOptions(job: OrchestratorJob): JobsOptions {
  const basePriority = planToQueuePriority(job.plan);
  const boosted = isPlannerDerivedJob(job) ? Math.max(0, basePriority - 5000) : basePriority;
  const opts: JobsOptions = {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    priority: boosted,
  };

  if (job.idempotency_key && job.idempotency_key.length > 0) {
    opts.jobId = sanitizeQueueJobId(`idem:${job.type}:${job.idempotency_key}`);
  }

  return opts;
}
