import { randomUUID } from 'node:crypto';
import { Queue } from 'bullmq';
import { logJobEnqueue } from './observability/job-log.js';
import { buildQueueAddOptions } from './queue-opts.js';
import { getJobTenantSlug } from './lib/tenant-context.js';
import {
  evaluateEnqueue,
  registerActiveLocalJob,
  registerSandboxJob,
} from './lib/runtime-governor.js';
import type { OrchestratorJob } from './types.js';

export class RuntimeGovernorRejectedError extends Error {
  constructor(
    message: string,
    readonly decision: Awaited<ReturnType<typeof evaluateEnqueue>>,
  ) {
    super(message);
    this.name = 'RuntimeGovernorRejectedError';
  }
}

export interface OpenClawQueueTask {
  objective: string;
  tenant_slug: string;
  tenant_id?: string;
  initiated_by: 'claude' | 'discord' | 'cron' | 'system';
  plan?: 'startup' | 'business' | 'enterprise';
  request_id?: string;
  metadata?: Record<string, unknown>;
}

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redisUrl = new URL(REDIS_URL);
const passwordFromUrl = redisUrl.password ? decodeURIComponent(redisUrl.password) : '';

export const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || '6379'),
  password: process.env.REDIS_PASSWORD || passwordFromUrl || undefined,
};

export const orchestratorQueue = new Queue('openclaw', { connection });

/** Local Agent Queue: Cursor, Claude, Copilot execution on local machines */
export const localAgentQueue = new Queue('local-agents', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 2000 },
  },
});

/** Cola sandbox clasificador de tareas (worker opcional: `OPSLY_AGENT_CLASSIFIER_WORKER_ENABLED`). */
export const agentClassifierQueue = new Queue('agent-classifier', { connection });

/** Approval Gate Phase 1: decisión Sonnet sobre métricas sandbox (worker opcional: `OPSLY_APPROVAL_GATE_WORKER_ENABLED`). */
export const approvalGateQueue = new Queue('approval-gate', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 2000 },
  },
});

/** Cola Hermes: tick periódico vía worker `HermesOrchestrationWorker` (`HERMES_ENABLED`). */
export const hermesOrchestrationQueue = new Queue('hermes-orchestration', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
  },
});

export async function enqueueJob(job: OrchestratorJob) {
  const isSandbox =
    job.type === 'sandbox_execution' || job.type === 'jcode_execution';
  if (isSandbox) {
    const governor = await evaluateEnqueue({
      job_type: job.type,
      agent_role: job.agent_role,
      tenant_plan: job.plan,
      autonomy_approved: job.metadata?.autonomy_approved === true,
    });
    if (!governor.allowed) {
      throw new RuntimeGovernorRejectedError(governor.reason, governor);
    }
    registerSandboxJob();
  }

  const opts = buildQueueAddOptions(job);

  // Route local agent jobs to local-agents queue
  const isLocalAgentJob = job.type?.startsWith('local_');
  const targetQueue = isLocalAgentJob ? localAgentQueue : orchestratorQueue;
  const bull = await targetQueue.add(job.type, job, opts);

  logJobEnqueue({
    event: 'job_enqueue',
    job_type: job.type,
    task_id: job.taskId,
    tenant_slug: getJobTenantSlug(job),
    tenant_id: job.tenant_id,
    plan: job.plan,
    request_id: job.request_id,
    idempotency_key: job.idempotency_key,
    bullmq_job_id_custom: Boolean(opts.jobId),
    initiated_by: job.initiated_by,
    agent_role: job.agent_role,
    cost_budget_usd: job.cost_budget_usd,
    autonomy_risk: job.autonomy_risk,
    queue_priority: opts.priority,
    metadata: job.metadata,
  });

  return bull;
}

/** Enqueue job to local-agents queue for execution on local machines (Cursor, Claude, etc) */
export async function enqueueLocalAgentJob(
  jobOrName: OrchestratorJob | string,
  payload?: Record<string, unknown>,
  requestId?: string
) {
  if (typeof jobOrName === 'object' && jobOrName !== null && 'type' in jobOrName) {
    const job = jobOrName as OrchestratorJob;
    const jobId =
      typeof job.idempotency_key === 'string' && job.idempotency_key.trim().length > 0
        ? job.idempotency_key.trim()
        : job.request_id ?? randomUUID();

    const governor = await evaluateEnqueue({
      job_type: job.type,
      agent_role: job.agent_role,
      tenant_plan: job.plan,
      autonomy_approved: job.metadata?.autonomy_approved === true,
      metadata: job.metadata,
    });
    if (!governor.allowed) {
      throw new RuntimeGovernorRejectedError(governor.reason, governor);
    }

    registerActiveLocalJob(String(jobId), job.agent_role ?? 'executor', job.tenant_slug);

    const bull = await localAgentQueue.add(job.type, job, {
      jobId,
      priority: 40000,
      attempts: 2,
      backoff: { type: 'exponential', delay: 2000 },
    });

    logJobEnqueue({
      event: 'job_enqueue',
      job_type: job.type,
      task_id: job.taskId,
      tenant_slug: getJobTenantSlug(job),
      tenant_id: job.tenant_id,
      plan: job.plan,
      request_id: job.request_id,
      idempotency_key: job.idempotency_key,
      bullmq_job_id_custom: Boolean(jobId),
      initiated_by: job.initiated_by,
      agent_role: job.agent_role,
      cost_budget_usd: job.cost_budget_usd,
      autonomy_risk: job.autonomy_risk,
      queue_priority: 40000,
      metadata: { ...job.metadata, bullmq_queue: 'local-agents' },
    });

    return bull;
  }

  const jobName = jobOrName as string;
  const rid = typeof requestId === 'string' && requestId.length > 0 ? requestId : randomUUID();
  const legacyPayload = payload ?? {};
  const legacyTenant =
    typeof legacyPayload.tenant_slug === 'string' && legacyPayload.tenant_slug.trim().length > 0
      ? legacyPayload.tenant_slug.trim()
      : 'local';
  const bull = await localAgentQueue.add(
    jobName,
    { payload: legacyPayload },
    {
      jobId: rid,
      priority: 40000,
      attempts: 2,
      backoff: { type: 'exponential', delay: 2000 },
    }
  );

  logJobEnqueue({
    event: 'job_enqueue',
    job_type: jobName as OrchestratorJob['type'],
    tenant_slug: legacyTenant,
    request_id: rid,
    bullmq_job_id_custom: true,
    initiated_by: 'system',
    queue_priority: 40000,
    metadata: { bullmq_queue: 'local-agents', legacy_local_enqueue: true },
  });

  return bull;
}
