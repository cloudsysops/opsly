import type { Job } from 'bullmq';
import type { OrchestratorJob } from '../types.js';
import { parseAutonomyRiskLevel } from '../autonomy/policy.js';

export type WorkerName =
  | 'cursor'
  | 'n8n'
  | 'notify'
  | 'drive'
  | 'backup'
  | 'health'
  | 'ollama'
  | 'sandbox'
  | 'budget'
  | 'webhooks-processing'
  | 'general-events'
  | 'agent-classifier'
  | 'approval-gate'
  | 'hermes-orchestration'
  | 'intent_dispatch'
  | 'openclaw-planner'
  | 'openclaw-skeptic'
  | 'evolution'
  | 'hive'
  | 'jcode'
  | 'terminal'
  | 'local_cursor'
  | 'local_claude'
  | 'local_copilot'
  | 'local_opencode';

export function extractJobContext(job: Job): {
  task_id?: string;
  tenant_slug?: string;
  tenant_id?: string;
  request_id?: string;
  plan?: string;
  idempotency_key?: string;
  metadata?: Record<string, unknown>;
  autonomy_risk?: 'low' | 'medium' | 'high';
} {
  const d = job.data as Partial<OrchestratorJob> & {
    payload?: { tenant_id?: string; tenant_slug?: string };
  };
  const autonomyRisk =
    parseAutonomyRiskLevel(d.autonomy_risk) ??
    parseAutonomyRiskLevel(d.metadata?.autonomy_risk);
  return {
    task_id: d.taskId,
    tenant_slug: d.tenant_slug ?? d.payload?.tenant_slug,
    tenant_id: d.tenant_id ?? d.payload?.tenant_id,
    request_id: d.request_id,
    plan: d.plan,
    idempotency_key: d.idempotency_key,
    metadata: d.metadata,
    autonomy_risk: autonomyRisk,
  };
}

export function logWorkerLifecycle(
  phase: 'start' | 'complete' | 'fail',
  worker: WorkerName,
  job: Job,
  extra?: { duration_ms?: number; error?: string }
): void {
  const ctx = extractJobContext(job);
  const status = phase === 'start' ? 'started' : phase === 'complete' ? 'completed' : 'failed';
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    service: 'orchestrator',
    event: `worker_${phase}`,
    worker,
    bullmq_job_id: String(job.id),
    status,
    ...ctx,
    kpi_dimension: {
      tenant_slug: ctx.tenant_slug ?? 'unknown',
      request_id: ctx.request_id ?? 'unknown',
      autonomy_risk: ctx.autonomy_risk ?? 'unknown',
      success: phase === 'complete',
    },
    ...extra,
  });
  process.stdout.write(`${line}\n`);
}
