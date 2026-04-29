import { Queue } from 'bullmq';
import { logJobEnqueue } from './observability/job-log.js';
import { buildQueueAddOptions } from './queue-opts.js';
import type { OrchestratorJob } from './types.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redisUrl = new URL(REDIS_URL);
const passwordFromUrl = redisUrl.password ? decodeURIComponent(redisUrl.password) : '';

export const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || '6379'),
  password: process.env.REDIS_PASSWORD || passwordFromUrl || undefined,
};

export const orchestratorQueue = new Queue('openclaw', { connection });
export const plannerQueue = new Queue('queue:planner', { connection });
export const skepticQueue = new Queue('queue:skeptic', { connection });

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
  const opts = buildQueueAddOptions(job);
  const bull = await orchestratorQueue.add(job.type, job, opts);

  logJobEnqueue({
    event: 'job_enqueue',
    job_type: job.type,
    task_id: job.taskId,
    tenant_slug: job.tenant_slug,
    tenant_id: job.tenant_id,
    plan: job.plan,
    request_id: job.request_id,
    idempotency_key: job.idempotency_key,
    bullmq_job_id_custom: Boolean(opts.jobId),
    initiated_by: job.initiated_by,
    agent_role: job.agent_role,
    cost_budget_usd: job.cost_budget_usd,
    queue_priority: opts.priority,
    metadata: job.metadata,
  });

  return bull;
}

export interface OpenClawQueueTask {
  request_id: string;
  tenant_id: string;
  tenant_slug: string;
  objective: string;
  initiated_by: OrchestratorJob['initiated_by'];
  plan?: OrchestratorJob['plan'];
  metadata?: Record<string, unknown>;
}

export async function enqueuePlannerTask(task: OpenClawQueueTask) {
  return plannerQueue.add('planner_task', task, {
    removeOnComplete: true,
    removeOnFail: false,
  });
}

export async function enqueueSkepticTask(task: OpenClawQueueTask) {
  return skepticQueue.add('skeptic_task', task, {
    removeOnComplete: true,
    removeOnFail: false,
  });
}
