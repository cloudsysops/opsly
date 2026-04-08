import { randomUUID } from "node:crypto";
import { enqueueJob } from "./queue.js";
import { setJobState } from "./state/store.js";
import type { IntentRequest, OrchestratorJob } from "./types.js";

function enrichJob(
  req: IntentRequest,
  base: Pick<OrchestratorJob, "type" | "payload" | "tenant_slug" | "initiated_by">,
  batchIndex: number,
  correlationId: string,
): OrchestratorJob {
  return {
    ...base,
    tenant_id: req.tenant_id,
    plan: req.plan,
    request_id: correlationId,
    cost_budget_usd: req.cost_budget_usd,
    agent_role: req.agent_role,
    idempotency_key: req.idempotency_key
      ? `${req.idempotency_key}::${base.type}::${batchIndex}`
      : undefined,
  };
}

export async function processIntent(req: IntentRequest) {
  const correlationId = req.request_id ?? randomUUID();
  const jobs: OrchestratorJob[] = [];
  let batchIndex = 0;

  switch (req.intent) {
    case "execute_code":
      jobs.push(
        enrichJob(
          req,
          {
            type: "cursor",
            payload: req.context,
            tenant_slug: req.tenant_slug,
            initiated_by: req.initiated_by,
          },
          batchIndex++,
          correlationId,
        ),
      );
      break;
    case "trigger_workflow":
      jobs.push(
        enrichJob(
          req,
          {
            type: "n8n",
            payload: req.context,
            tenant_slug: req.tenant_slug,
            initiated_by: req.initiated_by,
          },
          batchIndex++,
          correlationId,
        ),
      );
      break;
    case "notify":
      jobs.push(
        enrichJob(
          req,
          {
            type: "notify",
            payload: req.context,
            tenant_slug: req.tenant_slug,
            initiated_by: req.initiated_by,
          },
          batchIndex++,
          correlationId,
        ),
      );
      break;
    case "sync_drive":
      jobs.push(
        enrichJob(
          req,
          {
            type: "drive",
            payload: {},
            tenant_slug: req.tenant_slug,
            initiated_by: req.initiated_by,
          },
          batchIndex++,
          correlationId,
        ),
      );
      break;
    case "full_pipeline":
      jobs.push(
        enrichJob(
          req,
          {
            type: "cursor",
            payload: req.context,
            tenant_slug: req.tenant_slug,
            initiated_by: req.initiated_by,
          },
          batchIndex++,
          correlationId,
        ),
        enrichJob(
          req,
          {
            type: "notify",
            payload: { message: "Pipeline iniciado" },
            tenant_slug: req.tenant_slug,
            initiated_by: req.initiated_by,
          },
          batchIndex++,
          correlationId,
        ),
        enrichJob(
          req,
          {
            type: "drive",
            payload: {},
            tenant_slug: req.tenant_slug,
            initiated_by: req.initiated_by,
          },
          batchIndex++,
          correlationId,
        ),
      );
      break;
  }

  const enqueued = await Promise.all(jobs.map((job) => enqueueJob(job)));
  await Promise.all(
    enqueued.map(async (job, index) => {
      const queuedJob = jobs[index];
      await setJobState(String(job.id), {
        id: String(job.id),
        type: queuedJob.type,
        status: "pending",
        tenant_slug: queuedJob.tenant_slug,
        tenant_id: queuedJob.tenant_id,
        plan: queuedJob.plan,
        request_id: queuedJob.request_id,
        idempotency_key: queuedJob.idempotency_key,
        cost_budget_usd: queuedJob.cost_budget_usd,
        agent_role: queuedJob.agent_role,
        started_at: new Date().toISOString(),
      });
    }),
  );
  return {
    jobs_enqueued: enqueued.length,
    job_ids: enqueued.map((job) => job.id),
    intent: req.intent,
    request_id: correlationId,
  };
}
