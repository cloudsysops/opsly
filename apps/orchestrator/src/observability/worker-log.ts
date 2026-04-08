import type { Job } from "bullmq";
import type { OrchestratorJob } from "../types.js";

export type WorkerName = "cursor" | "n8n" | "notify" | "drive";

export function extractJobContext(job: Job): {
  tenant_slug?: string;
  tenant_id?: string;
  request_id?: string;
  plan?: string;
  idempotency_key?: string;
} {
  const d = job.data as Partial<OrchestratorJob>;
  return {
    tenant_slug: d.tenant_slug,
    tenant_id: d.tenant_id,
    request_id: d.request_id,
    plan: d.plan,
    idempotency_key: d.idempotency_key,
  };
}

export function logWorkerLifecycle(
  phase: "start" | "complete" | "fail",
  worker: WorkerName,
  job: Job,
  extra?: { duration_ms?: number; error?: string },
): void {
  const ctx = extractJobContext(job);
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    service: "orchestrator",
    event: `worker_${phase}`,
    worker,
    bullmq_job_id: String(job.id),
    ...ctx,
    ...extra,
  });
  process.stdout.write(`${line}\n`);
}
