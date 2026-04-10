import type { Job } from "bullmq";
import type { OrchestratorJob } from "../types.js";

export type WorkerName =
  | "cursor"
  | "n8n"
  | "notify"
  | "drive"
  | "backup"
  | "health"
  | "budget"
  | "webhooks-processing"
  | "general-events";

export function extractJobContext(job: Job): {
  task_id?: string;
  tenant_slug?: string;
  tenant_id?: string;
  request_id?: string;
  plan?: string;
  idempotency_key?: string;
  metadata?: Record<string, unknown>;
} {
  const d = job.data as Partial<OrchestratorJob> & {
    payload?: { tenant_id?: string; tenant_slug?: string };
  };
  return {
    task_id: d.taskId,
    tenant_slug: d.tenant_slug ?? d.payload?.tenant_slug,
    tenant_id: d.tenant_id ?? d.payload?.tenant_id,
    request_id: d.request_id,
    plan: d.plan,
    idempotency_key: d.idempotency_key,
    metadata: d.metadata,
  };
}

export function logWorkerLifecycle(
  phase: "start" | "complete" | "fail",
  worker: WorkerName,
  job: Job,
  extra?: { duration_ms?: number; error?: string },
): void {
  const ctx = extractJobContext(job);
  const status = phase === "start" ? "started" : phase === "complete" ? "completed" : "failed";
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    service: "orchestrator",
    event: `worker_${phase}`,
    worker,
    bullmq_job_id: String(job.id),
    status,
    ...ctx,
    ...extra,
  });
  process.stdout.write(`${line}\n`);
}
