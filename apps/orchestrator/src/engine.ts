import { randomUUID } from "node:crypto";
import { callRemotePlanner } from "./llm-gateway-client.js";
import { enqueueJob } from "./queue.js";
import {
  buildPlannerContextSnapshot,
  DEFAULT_PLANNER_TOOL_NAMES,
  plannerActionToOrchestratorJob,
} from "./planner-map.js";
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
      if (!req.tenant_slug || req.tenant_slug.length === 0) {
        throw new Error("remote_plan requires tenant_slug (Hermes / tenant isolation)");
      }
      const snapshot = buildPlannerContextSnapshot({ ...req, intent });
      const gw = await callRemotePlanner(
        {
          tenant_slug: req.tenant_slug,
          request_id: correlationId,
          tenant_plan: req.plan,
          context: snapshot,
          available_tools: DEFAULT_PLANNER_TOOL_NAMES,
        },
        { requestId: correlationId, tenantSlug: req.tenant_slug },
      );

      process.stdout.write(
        `${JSON.stringify({
          event: "planner_response",
          request_id: correlationId,
          tenant_slug: req.tenant_slug,
          planner: gw.planner,
        })}\n`,
      );

      for (let i = 0; i < gw.planner.actions.length; i++) {
        const action = gw.planner.actions[i];
        if (!action) {
          continue;
        }
        const planned = plannerActionToOrchestratorJob(action, req, correlationId, i);
        jobs.push({
          ...planned,
          cost_budget_usd: req.cost_budget_usd,
          agent_role: "executor",
        });
      }

      const enqueued = await Promise.all(jobs.map((job) => enqueueJob(job)));
      await Promise.all(
        enqueued.map(async (job, index) => {
          const queuedJob = jobs[index];
          if (!queuedJob) {
            return;
          }
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
        job_ids: enqueued.map((job) => String(job.id)),
        intent,
        request_id: correlationId,
        planner: {
          reasoning: gw.planner.reasoning,
          actions_count: gw.planner.actions.length,
          llm: gw.llm,
        },
      };
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
    job_ids: enqueued.map((job) => String(job.id)),
    intent,
    request_id: correlationId,
  };
}
