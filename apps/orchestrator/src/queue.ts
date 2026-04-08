import { Queue } from "bullmq";
import { logJobEnqueue } from "./observability/job-log.js";
import { buildQueueAddOptions } from "./queue-opts.js";
import type { OrchestratorJob } from "./types.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const redisUrl = new URL(REDIS_URL);

export const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || "6379"),
  password: process.env.REDIS_PASSWORD
};

export const orchestratorQueue = new Queue("openclaw", { connection });

export async function enqueueJob(job: OrchestratorJob) {
  const opts = buildQueueAddOptions(job);
  const bull = await orchestratorQueue.add(job.type, job, opts);

  logJobEnqueue({
    event: "job_enqueue",
    job_type: job.type,
    tenant_slug: job.tenant_slug,
    tenant_id: job.tenant_id,
    plan: job.plan,
    request_id: job.request_id,
    idempotency_key: job.idempotency_key,
    bullmq_job_id_custom: Boolean(opts.jobId),
    initiated_by: job.initiated_by,
    agent_role: job.agent_role,
    cost_budget_usd: job.cost_budget_usd,
  });

  return bull;
}
