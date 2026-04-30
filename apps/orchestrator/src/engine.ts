import { randomUUID } from 'node:crypto';
import { buildConsciousAppendix } from './agents/conscious-layer.js';
import { createDefaultToolRegistry } from './agents/tools/registry.js';
import { evaluateAutomationPolicy } from './agents/opsly-lili/policy-engine.js';
import { MAX_PLANNER_ACTIONS } from './constants-planner.js';
import type { Queue } from 'bullmq';
import { logUsage } from '@intcloudsysops/llm-gateway';
import {
  type OarEnqueueJobPayload,
  OpslyActionAdapter,
} from './runtime/adapters/opsly-action-adapter.js';
import { createOarTextCompletionClient } from './runtime/llm/oar-text-completion-client.js';
import { InMemoryMemory } from './runtime/memory/in-memory-memory.js';
import { runReActStrategy } from './runtime/strategies/react-engine.js';
import { runPlanExecuteStrategy } from './runtime/strategies/plan-execute-engine.js';
import {
  meterPlannerLlmFireAndForget,
  meterRemotePlanWorkerFireAndForget,
} from './metering/usage-events-meter.js';
import { logPlannerActionEnqueued, logPlannerUnknownTool } from './observability/planner-log.js';
import { parseOrchestratorRole, shouldRunControlPlane } from './orchestrator-role.js';
import { executeRemotePlanner } from './planner-client.js';
import { runOpenClawController } from './openclaw/controller.js';
import { logOpenClawEvent } from './openclaw/observability.js';
import {
  DEFAULT_PLANNER_TOOL_NAMES,
  buildPlannerContextSnapshot,
  plannerActionToOrchestratorJob,
} from './planner-map.js';
import { enqueueJob, orchestratorQueue } from './queue.js';
import { SprintManager } from './sprints/sprint-manager.js';
import { setJobState } from './state/store.js';
import type { Intent, IntentRequest, OrchestratorJob } from './types.js';

function enrichJob(
  req: IntentRequest,
  base: Pick<OrchestratorJob, 'type' | 'payload' | 'tenant_slug' | 'initiated_by'>,
  batchIndex: number,
  correlationId: string
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

/** Base URL/API token para `OpslyActionAdapter` (OAR); sin secretos hardcodeados. */
function resolveOarActionAdapterApiConfig(): { baseUrl: string; authToken: string } {
  const baseUrl =
    process.env.OPSLY_API_INTERNAL_URL?.trim() ||
    process.env.OPSLY_API_URL?.trim() ||
    'http://app:3000';
  const authToken =
    process.env.PLATFORM_ADMIN_TOKEN?.trim() || process.env.OPSLY_API_TOKEN?.trim() || '';
  return { baseUrl, authToken };
}

/** Cola `openclaw` como `default` para acciones OAR asíncronas (mismo Redis que el orchestrator). */
function buildOarActionQueues(): Record<string, Queue<OarEnqueueJobPayload>> {
  return {
    default: orchestratorQueue as Queue<OarEnqueueJobPayload>,
  };
}

export interface ProcessIntentOptions {
  /**
   * Solo para jobs `intent_dispatch` en worker: permite `oar_react` sin control plane local
   * (MCP → cola → worker remoto con LLM gateway).
   */
  invokedFromIntentDispatchWorker?: boolean;
}

export interface ProcessIntentResult {
  jobs_enqueued: number;
  job_ids: string[];
  intent: Intent;
  request_id: string;
  /** Presente cuando `intent === "sprint_plan"`. */
  sprint_id?: string;
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
  /** Presente cuando `intent === "oar_react"` (OAR ReAct). */
  oar?: {
    state: 'completed' | 'failed';
    final_answer?: string;
    error_message?: string;
    steps_executed: number;
    last_lifecycle_state: string;
  };
}

export async function processIntent(
  req: IntentRequest,
  options?: ProcessIntentOptions
): Promise<ProcessIntentResult> {
  const routing = runOpenClawController(req);
  const intentPreview = routing.intent;
  const allowOarOnWorker =
    options?.invokedFromIntentDispatchWorker === true && intentPreview === 'oar_react';
  if (!allowOarOnWorker && !shouldRunControlPlane(parseOrchestratorRole())) {
    throw new Error('Cannot dispatch jobs from worker-only mode');
  }

  const correlationId = req.request_id ?? randomUUID();
  const jobs: OrchestratorJob[] = [];
  let batchIndex = 0;

  const intent = routing.intent;
  logOpenClawEvent('openclaw_router_decision', {
    request_id: req.request_id ?? null,
    tenant_slug: req.tenant_slug ?? null,
    agent_role: req.agent_role ?? null,
    source_intent: req.intent,
    routed_intent: intent,
    reason: routing.reason,
    execution_target: routing.execution.target,
    execution_transport: routing.execution.transport,
    execution_queue: routing.execution.queue,
    execution_skill: routing.execution.skill,
    execution_mcp_server: routing.execution.mcp?.server ?? null,
    execution_mcp_tool: routing.execution.mcp?.tool ?? null,
    llm_routing_bias: routing.llm.routing_bias,
    llm_provider_hint: routing.llm.provider_hint,
    routed_agent_id: routing.agent.id,
    routed_agent_role: routing.agent.role,
    routed_agent_skill_binding: routing.agent.skill_binding,
    routed_model_tier: routing.agent.model_tier,
    routed_targets: routing.agent.targets,
    routed_tenant_permissions: routing.agent.tenant_permissions,
  });

  switch (intent) {
    case 'oar_react': {
      const tenantSlug = req.tenant_slug?.trim();
      if (!tenantSlug || tenantSlug.length === 0) {
        throw new Error('oar_react requires tenant_slug');
      }
      let promptSource = '';
      if (typeof req.context.prompt === 'string') {
        promptSource = req.context.prompt;
      } else if (typeof req.context.query === 'string') {
        promptSource = req.context.query;
      }
      const promptRaw = promptSource.trim();
      if (promptRaw.length === 0) {
        throw new Error('oar_react requires context.prompt or context.query (non-empty string)');
      }
      const sessionId =
        typeof req.context.session_id === 'string' && req.context.session_id.trim().length > 0
          ? req.context.session_id.trim()
          : correlationId;
      let maxSteps: number | undefined;
      const ms = req.context.max_steps;
      if (typeof ms === 'number' && Number.isFinite(ms) && ms > 0) {
        maxSteps = Math.min(100, Math.floor(ms));
      }

      const memory = new InMemoryMemory();
      const { baseUrl, authToken } = resolveOarActionAdapterApiConfig();
      const actionPort = new OpslyActionAdapter({ baseUrl, authToken }, buildOarActionQueues(), {
        toolsExecutePath: '/api/tools/execute',
        defaultQueueKey: 'default',
        requestId: correlationId,
        sessionId,
        meteringCallback: async (params) => {
          try {
            await logUsage({
              tenant_slug: params.tenantSlug,
              model: `oar_action:${params.actionName}`,
              tokens_input: 0,
              tokens_output: 0,
              cost_usd: 0,
              cache_hit: false,
              request_id: params.requestId,
              session_id: params.sessionId,
              created_at: new Date().toISOString(),
            });
          } catch {
            // Silently ignore metering errors
          }
        },
      });
      const llmClient = createOarTextCompletionClient({
        tenantSlug,
        requestId: correlationId,
        tenantId: req.tenant_id,
        tenantPlan: req.plan,
        routingBias: routing.llm.routing_bias ?? undefined,
        providerHint: routing.llm.provider_hint ?? undefined,
      });

      const initialPrompt = `You are the Opsly OAR ReAct agent. Follow the JSON protocol in your instructions.\n\nUser task:\n${promptRaw}`;

      const liliDecision = evaluateAutomationPolicy(promptRaw);
      const policyInstructions = liliDecision.useN8nAutomation
        ? `\n\nPolicy (opsly_lili): ${liliDecision.reason}\nExecute with this plan:\n1) ${liliDecision.recommendedSteps[0]}\n2) ${liliDecision.recommendedSteps[1]}\n3) ${liliDecision.recommendedSteps[2]}\nAlways keep tenant_slug and request_id in actions.`
        : '';
      const effectivePrompt = `${initialPrompt}${policyInstructions}`;

      // Mode System: Select strategy based on tenant mode
      const tenantMode =
        typeof req.context.tenantMode === 'string'
          ? req.context.tenantMode.toLowerCase()
          : 'hacker';

      const usesPlanExecute =
        tenantMode === 'architect' ||
        tenantMode === 'developer' ||
        liliDecision.recommendedMode === 'plan_execute';

      const oarResult = usesPlanExecute
        ? await runPlanExecuteStrategy(
            tenantSlug,
            sessionId,
            effectivePrompt,
            actionPort,
            memory,
            llmClient,
            { maxPlanSteps: maxSteps }
          )
        : await runReActStrategy(
            tenantSlug,
            sessionId,
            effectivePrompt,
            actionPort,
            memory,
            llmClient,
            { maxSteps }
          );

      process.stdout.write(
        `${JSON.stringify({
          event: 'oar_react_result',
          request_id: correlationId,
          tenant_slug: tenantSlug,
          state: oarResult.state,
          steps_executed: oarResult.stepsExecuted,
        })}\n`
      );

      const result = {
        jobs_enqueued: 0,
        job_ids: [],
        intent,
        request_id: correlationId,
        oar: {
          state: oarResult.state,
          final_answer: oarResult.finalAnswer,
          error_message: oarResult.errorMessage,
          steps_executed: oarResult.stepsExecuted,
          last_lifecycle_state: oarResult.lastLifecycleState,
        },
      };
      logOpenClawEvent('openclaw_intent_result', {
        request_id: correlationId,
        tenant_slug: tenantSlug,
        intent,
        jobs_enqueued: result.jobs_enqueued,
        oar_state: oarResult.state,
      });
      return result;
    }
    case 'sprint_plan': {
      const goal = typeof req.context.goal === 'string' ? req.context.goal.trim() : '';
      if (goal.length === 0) {
        throw new Error('sprint_plan requires context.goal (string)');
      }
      const tenantId = req.tenant_id?.trim();
      const tenantSlug = req.tenant_slug?.trim();
      if (!tenantId || !tenantSlug) {
        throw new Error('sprint_plan requires tenant_id and tenant_slug');
      }
      const manager = new SprintManager();
      const { sprintId } = await manager.createSprint({
        tenantId,
        tenantSlug,
        goal,
        requestId: correlationId,
        plan: req.plan,
        intentRequest: req,
      });
      void manager.executeSprint(sprintId).catch((err) => {
        process.stderr.write(
          `${JSON.stringify({
            event: 'sprint_execute_error',
            sprint_id: sprintId,
            error: err instanceof Error ? err.message : String(err),
          })}\n`
        );
      });
      const result = {
        jobs_enqueued: 0,
        job_ids: [],
        intent,
        request_id: correlationId,
        sprint_id: sprintId,
      };
      logOpenClawEvent('openclaw_intent_result', {
        request_id: correlationId,
        tenant_slug: tenantSlug,
        intent,
        jobs_enqueued: result.jobs_enqueued,
        sprint_id: sprintId,
      });
      return result;
    }
    case 'remote_plan': {
      const tenantSlug = req.tenant_slug;
      if (!tenantSlug || tenantSlug.length === 0) {
        throw new Error('remote_plan requires tenant_slug (Hermes / tenant isolation)');
      }
      const snapshot = buildPlannerContextSnapshot({ ...req, intent });
      const toolRegistry = createDefaultToolRegistry();
      let intentHint = 'necesito calcular';
      if (typeof req.context.query === 'string') {
        intentHint = req.context.query;
      } else if (typeof req.context.prompt === 'string') {
        intentHint = req.context.prompt;
      }
      const discoveredTools = toolRegistry.search(intentHint);
      if (discoveredTools.length > 0) {
        process.stdout.write(
          `${JSON.stringify({
            event: 'tool_registry_match',
            request_id: correlationId,
            query: intentHint,
            tools: discoveredTools.map((t) => t.name),
          })}\n`
        );
      }
      const plannerTools = Array.from(
        new Set([...DEFAULT_PLANNER_TOOL_NAMES, ...toolRegistry.listToolNames()])
      );
      let contextStr = JSON.stringify(snapshot, null, 2);
      const consciousAppendix = await buildConsciousAppendix({
        intentHint,
        tenantId: req.tenant_id ?? '',
        requestId: correlationId,
        toolRegistry,
      });
      if (consciousAppendix.length > 0) {
        contextStr = `${contextStr}\n${consciousAppendix}`;
      }
      const remotePlanStartedAt = Date.now();
      try {
        const gw = await executeRemotePlanner(contextStr, plannerTools, {
          tenantSlug,
          requestId: correlationId,
          tenantPlan: req.plan,
          routingBias: routing.llm.routing_bias ?? undefined,
          providerHint: routing.llm.provider_hint ?? undefined,
        });
        meterPlannerLlmFireAndForget(tenantSlug, req.tenant_id, {
          model_used: gw.llm.model_used,
          tokens_input: gw.llm.tokens_input,
          tokens_output: gw.llm.tokens_output,
        });

        process.stdout.write(
          `${JSON.stringify({
            event: 'planner_response',
            request_id: correlationId,
            tenant_slug: tenantSlug,
            planner: gw.planner,
          })}\n`
        );

        if (gw.planner.actions.length > MAX_PLANNER_ACTIONS) {
          throw new Error('Plan demasiado complejo: más de 5 acciones');
        }

        const plannedJobs: OrchestratorJob[] = [];
        const enqueuedPlannerTools: string[] = [];
        for (let i = 0; i < gw.planner.actions.length; i++) {
          const action = gw.planner.actions[i];
          if (!action) {
            continue;
          }
          const localTool = toolRegistry.get(action.tool);
          if (localTool) {
            const toolOutput = await localTool.execute(action.params);
            plannedJobs.push({
              type: 'notify',
              payload: {
                title: `Tool: ${localTool.name}`,
                message: JSON.stringify(toolOutput),
                type: 'info',
                planner_tool: localTool.name,
              },
              tenant_slug: req.tenant_slug,
              tenant_id: req.tenant_id,
              initiated_by: req.initiated_by,
              plan: req.plan,
              request_id: correlationId,
              idempotency_key: `${correlationId}::planner::${localTool.name}::${i}`,
              agent_role: 'tool',
              metadata: req.metadata,
            });
            enqueuedPlannerTools.push(localTool.name);
            continue;
          }
          const mapped = plannerActionToOrchestratorJob(action, req, correlationId, i);
          if (!mapped) {
            logPlannerUnknownTool({
              event: 'planner_unknown_tool',
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
            agent_role: 'executor',
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
              event: 'planner_action_enqueued',
              tool: enqueuedPlannerTools[index] ?? 'unknown',
              tenant_slug: tenantSlug,
              action_id: index,
              request_id: correlationId,
              job_type: queuedJob.type,
              bullmq_job_id: jobId,
            });
            await setJobState(jobId, {
              id: jobId,
              type: queuedJob.type,
              status: 'pending',
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
          })
        );

        const result = {
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
        logOpenClawEvent('openclaw_intent_result', {
          request_id: correlationId,
          tenant_slug: tenantSlug,
          intent,
          jobs_enqueued: result.jobs_enqueued,
          planner_actions: gw.planner.actions.length,
        });
        return result;
      } finally {
        meterRemotePlanWorkerFireAndForget(
          tenantSlug,
          req.tenant_id,
          (Date.now() - remotePlanStartedAt) / 1000
        );
      }
    }
    case 'execute_code':
      jobs.push(
        enrichJob(
          req,
          {
            type: 'cursor',
            payload: req.context,
            tenant_slug: req.tenant_slug,
            initiated_by: req.initiated_by,
          },
          batchIndex++,
          correlationId
        )
      );
      break;
    case 'trigger_workflow':
      jobs.push(
        enrichJob(
          req,
          {
            type: 'n8n',
            payload: req.context,
            tenant_slug: req.tenant_slug,
            initiated_by: req.initiated_by,
          },
          batchIndex++,
          correlationId
        )
      );
      break;
    case 'notify':
      jobs.push(
        enrichJob(
          req,
          {
            type: 'notify',
            payload: req.context,
            tenant_slug: req.tenant_slug,
            initiated_by: req.initiated_by,
          },
          batchIndex++,
          correlationId
        )
      );
      break;
    case 'sync_drive':
      jobs.push(
        enrichJob(
          req,
          {
            type: 'drive',
            payload: {},
            tenant_slug: req.tenant_slug,
            initiated_by: req.initiated_by,
          },
          batchIndex++,
          correlationId
        )
      );
      break;
    case 'full_pipeline':
      jobs.push(
        enrichJob(
          req,
          {
            type: 'cursor',
            payload: req.context,
            tenant_slug: req.tenant_slug,
            initiated_by: req.initiated_by,
          },
          batchIndex++,
          correlationId
        ),
        enrichJob(
          req,
          {
            type: 'notify',
            payload: { message: 'Pipeline iniciado' },
            tenant_slug: req.tenant_slug,
            initiated_by: req.initiated_by,
          },
          batchIndex++,
          correlationId
        ),
        enrichJob(
          req,
          {
            type: 'drive',
            payload: {},
            tenant_slug: req.tenant_slug,
            initiated_by: req.initiated_by,
          },
          batchIndex++,
          correlationId
        )
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
        status: 'pending',
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
    })
  );
  const result = {
    jobs_enqueued: enqueued.length,
    job_ids: enqueued.map((job) => String(job.id)),
    intent,
    request_id: correlationId,
  };
  logOpenClawEvent('openclaw_intent_result', {
    request_id: correlationId,
    tenant_slug: req.tenant_slug ?? null,
    intent,
    jobs_enqueued: result.jobs_enqueued,
  });
  return result;
}
