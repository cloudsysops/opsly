import { randomUUID } from "node:crypto";
import { MAX_PLANNER_ACTIONS } from "./constants-planner.js";
import {
    meterPlannerLlmFireAndForget,
    meterRemotePlanWorkerFireAndForget,
} from "./metering/usage-events-meter.js";
import { logPlannerActionEnqueued, logPlannerUnknownTool } from "./observability/planner-log.js";
import { executeRemotePlanner } from "./planner-client.js";
import {
    DEFAULT_PLANNER_TOOL_NAMES,
    buildPlannerContextSnapshot,
    plannerActionToOrchestratorJob,
} from "./planner-map.js";
import { enqueueJob } from "./queue.js";
import { setJobState } from "./state/store.js";
import type { Intent, IntentRequest, OrchestratorJob } from "./types.js";

function enrichJob(
  req: IntentRequest,
  base: Pick<OrchestratorJob, "type" | "payload" | "tenant_slug" | "initiated_by">,
  batchIndex: number,
  correlationId: string,
): OrchestratorJob {
  return {
    ...base,
    taskId: req.taskId,
    tenant_id: req.tenant_id,
    plan: req.plan,
    request_id: correlationId,
    cost_budget_usd: req.cost_budget_usd,
    agent_role: req.agent_role,
    idempotency_key: req.idempotency_key
      ? `${req.idempotency_key}::${base.type}::${batchIndex}`
      : undefined,
    metadata: req.metadata,
  };
}

function effectiveIntent(req: IntentRequest): Intent {
  if (req.agent_role === "planner" && req.intent !== "remote_plan") {
    return "remote_plan";
  }
  return req.intent;
}

export interface ProcessIntentResult {
  jobs_enqueued: number;
  job_ids: string[];
  intent: Intent;
  request_id: string;
  planner?: {
    reasoning: string;
    actions_count: number;
    llm: {
      model_used: string;
      tokens_input: number;
      tokens_output: number;
      cost_usd: number;
      latency_ms: number;
      cache_hit: boolean;
    };
  };
}

export async function processIntent(req: IntentRequest): Promise<ProcessIntentResult> {
  const correlationId = req.request_id ?? randomUUID();
  const jobs: OrchestratorJob[] = [];
  let batchIndex = 0;

  const intent = effectiveIntent(req);

  switch (intent) {
    case "remote_plan": {
      const tenantSlug = req.tenant_slug;
      if (!tenantSlug || tenantSlug.length === 0) {
        throw new Error("remote_plan requires tenant_slug (Hermes / tenant isolation)");
      }
      const snapshot = buildPlannerContextSnapshot({ ...req, intent });
      const contextStr = JSON.stringify(snapshot, null, 2);
      const remotePlanStartedAt = Date.now();
      try {
        const gw = await executeRemotePlanner(contextStr, DEFAULT_PLANNER_TOOL_NAMES, {
          tenantSlug,
          requestId: correlationId,
          tenantPlan: req.plan,
        });
        meterPlannerLlmFireAndForget(tenantSlug, req.tenant_id, {
          model_used: gw.llm.model_used,
          tokens_input: gw.llm.tokens_input,
          tokens_output: gw.llm.tokens_output,
        });

        process.stdout.write(
          `${JSON.stringify({
            event: "planner_response",
            request_id: correlationId,
            tenant_slug: tenantSlug,
            planner: gw.planner,
          })}\n`,
        );

        if (gw.planner.actions.length > MAX_PLANNER_ACTIONS) {
          throw new Error("Plan demasiado complejo: más de 5 acciones");
        }

        const plannedJobs: OrchestratorJob[] = [];
        const enqueuedPlannerTools: string[] = [];
        for (let i = 0; i < gw.planner.actions.length; i++) {
          const action = gw.planner.actions[i];
          if (!action) {
            continue;
          }
          const mapped = plannerActionToOrchestratorJob(action, req, correlationId, i);
          if (!mapped) {
            logPlannerUnknownTool({
              event: "planner_unknown_tool",
              tool: action.tool,
              tenant_slug: tenantSlug,
              request_id: correlationId,
              action_id: i,
            });
            continue;
          }
          plannedJobs.push({
            ...mapped,
            cost_budget_usd: req.cost_budget_usd,
            agent_role: "executor",
            taskId: req.taskId,
            metadata: req.metadata,
          });
          enqueuedPlannerTools.push(action.tool);
        }

        const enqueued = await Promise.all(plannedJobs.map((job) => enqueueJob(job)));
        await Promise.all(
          enqueued.map(async (job, index) => {
            const queuedJob = plannedJobs[index];
            if (!queuedJob || !job.id) {
              return;
            }
            const jobId = String(job.id);
            logPlannerActionEnqueued({
              event: "planner_action_enqueued",
              tool: enqueuedPlannerTools[index] ?? "unknown",
              tenant_slug: tenantSlug,
              action_id: index,
              request_id: correlationId,
              job_type: queuedJob.type,
              bullmq_job_id: jobId,
            });
            await setJobState(jobId, {
              id: jobId,
              type: queuedJob.type,
              status: "pending",
              task_id: queuedJob.taskId,
              tenant_slug: queuedJob.tenant_slug,
              tenant_id: queuedJob.tenant_id,
              plan: queuedJob.plan,
              request_id: queuedJob.request_id,
              idempotency_key: queuedJob.idempotency_key,
              cost_budget_usd: queuedJob.cost_budget_usd,
              agent_role: queuedJob.agent_role,
              metadata: queuedJob.metadata,
              started_at: new Date().toISOString(),
            });
          }),
        );

        return {
          jobs_enqueued: enqueued.length,
          job_ids: enqueued.map((job) => String(job.id)),
          intent,
          request_id: correlationId,
          planner: {
            reasoning: gw.planner.reasoning,
            actions_count: gw.planner.actions.length,
            llm: gw.llm,
          },
        };
      } finally {
        meterRemotePlanWorkerFireAndForget(
          tenantSlug,
          req.tenant_id,
          (Date.now() - remotePlanStartedAt) / 1000,
        );
      }
    }
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
        task_id: queuedJob.taskId,
        tenant_slug: queuedJob.tenant_slug,
        tenant_id: queuedJob.tenant_id,
        plan: queuedJob.plan,
        request_id: queuedJob.request_id,
        idempotency_key: queuedJob.idempotency_key,
        cost_budget_usd: queuedJob.cost_budget_usd,
        agent_role: queuedJob.agent_role,
        metadata: queuedJob.metadata,
        started_at: new Date().toISOString(),
      });
    }),
  );
  return {
    jobs_enqueued: enqueued.length,
    job_ids: enqueued.map((job) => String(job.id)),
    intent,
    request_id: correlationId,
  };
}
