import type { OrchestratorJob } from "../types.js";

export interface JobEnqueueLogFields {
  event: "job_enqueue";
  job_type: OrchestratorJob["type"];
  tenant_slug?: string;
  tenant_id?: string;
  plan?: string;
  request_id?: string;
  idempotency_key?: string;
  /** Presente si BullMQ usa jobId fijo. */
  bullmq_job_id_custom?: boolean;
  initiated_by: OrchestratorJob["initiated_by"];
  agent_role?: string;
  cost_budget_usd?: number;
  /** Prioridad BullMQ (0 = máxima); ver `planToQueuePriority` en `queue-opts.ts`. */
  queue_priority?: number;
}

/**
 * Una línea JSON por job encolado (parseable por agregadores).
 */
export function logJobEnqueue(fields: JobEnqueueLogFields): void {
  const line = JSON.stringify({
    ...fields,
    ts: new Date().toISOString(),
    service: "orchestrator",
  });
  process.stdout.write(`${line}\n`);
}
