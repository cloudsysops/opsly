import { randomUUID } from 'node:crypto';
import { orchestratorQueue } from '../queue.js';
import type { IntentRequest } from '../types.js';
import {
  type OpenClawAgentRole,
  type OpenClawControllerResult,
  type OpenClawGoalInput,
  type OpenClawPlannedTask,
} from './contracts.js';
import { logOpenClawControllerEvent, routeTasks } from './router.js';
import { createOpenClawRegistry } from './registry.js';
import { resolveOpenClawExecutionPolicy } from './policies.js';

interface OpenClawBuildIntentRequestInput {
  tenantSlug?: string;
  initiatedBy: IntentRequest['initiated_by'];
  role: OpenClawAgentRole;
  objective: string;
  correlationId: string;
  metadata?: Record<string, unknown>;
  tenantId?: string;
  plan?: IntentRequest['plan'];
  taskId?: string;
}

function buildIntentRequest(input: OpenClawBuildIntentRequestInput): IntentRequest {
  const registry = createOpenClawRegistry();
  const agentConfig = registry.getAgent(input.role);
  const tenantSlug = input.tenantSlug ?? 'unknown-tenant';
  return {
    intent: 'remote_plan',
    context: {
      query: input.objective,
      openclaw_role: input.role,
      openclaw_skill: agentConfig.skill,
      openclaw_model_tier: agentConfig.modelTier,
      openclaw_queue_hint: agentConfig.queueName,
    },
    tenant_slug: tenantSlug,
    tenant_id: input.tenantId,
    initiated_by: input.initiatedBy,
    plan: input.plan,
    request_id: input.correlationId,
    agent_role: 'planner',
    taskId: input.taskId,
    metadata: {
      ...input.metadata,
      openclaw: {
        role: input.role,
        skill: agentConfig.skill,
        queue: agentConfig.queueName,
      },
    },
  };
}

interface OpenClawEnqueueRoleTaskInput {
  tenantSlug?: string;
  initiatedBy: IntentRequest['initiated_by'];
  role: OpenClawAgentRole;
  objective: string;
  correlationId: string;
  metadata?: Record<string, unknown>;
  tenantId?: string;
  plan?: IntentRequest['plan'];
  taskId?: string;
}

async function enqueueRoleTask(input: OpenClawEnqueueRoleTaskInput): Promise<string> {
  const tenantSlug = input.tenantSlug ?? 'unknown-tenant';
  const registry = createOpenClawRegistry();
  const agentConfig = registry.getAgent(input.role);
  const intentRequest = buildIntentRequest({
    tenantSlug,
    initiatedBy: input.initiatedBy,
    role: input.role,
    objective: input.objective,
    correlationId: input.correlationId,
    metadata: input.metadata,
    tenantId: input.tenantId,
    plan: input.plan,
    taskId: input.taskId,
  });
  const task: OpenClawPlannedTask = {
    role: input.role,
    queue: agentConfig.queueName,
    intentRequest,
  };
  const routed = routeTasks([task])[0];
  const queueName = routed?.queue ?? 'openclaw';
  const bullJob = await orchestratorQueue.add(
    queueName,
    {
      type: 'intent_dispatch',
      payload: {
        intent_request: intentRequest,
      },
      taskId: `${input.correlationId}::${input.role}`,
      tenant_slug: tenantSlug,
      tenant_id: input.tenantId,
      initiated_by: input.initiatedBy,
      plan: input.plan,
      request_id: input.correlationId,
      idempotency_key: `${input.correlationId}::${input.role}`,
      agent_role: 'planner',
      metadata: intentRequest.metadata,
    },
    {
      jobId: `${input.correlationId}::${input.role}`,
      removeOnComplete: 1000,
      removeOnFail: 5000,
    }
  );
  logOpenClawControllerEvent({
    event: 'openclaw_route_enqueued',
    request_id: input.correlationId,
    tenant_slug: tenantSlug,
    agent_role: input.role,
    queue: queueName,
    skill: agentConfig.skill,
    model_tier: agentConfig.modelTier,
    bullmq_job_id: String(bullJob.id),
  });
  return String(bullJob.id);
}

function buildControllerRoles(): OpenClawAgentRole[] {
  return ['planner', 'builder', 'skeptic', 'validator', 'deploy'];
}

export async function runOpenClawController(
  goal: OpenClawGoalInput
): Promise<OpenClawControllerResult> {
  const tenantSlug = goal.tenantSlug;
  const requestId = goal.requestId;
  const roles = buildControllerRoles();
  const queuedJobs: string[] = [];
  const skippedRoles: OpenClawAgentRole[] = [];
  for (const role of roles) {
    const tenantPermissionsByRole = (goal.metadata?.tenant_permissions_by_role ??
      {}) as Record<string, unknown>;
    const policy = resolveOpenClawExecutionPolicy({
      role,
      tenantPermissionsByRole,
    });
    if (!policy.enabled) {
      skippedRoles.push(role);
      logOpenClawControllerEvent({
        event: 'openclaw_route_skipped',
        request_id: requestId,
        tenant_slug: tenantSlug,
        agent_role: role,
        reason: 'disabled_by_tenant_policy',
      });
      continue;
    }
    const jobId = await enqueueRoleTask({
      tenantSlug,
      initiatedBy: goal.initiatedBy,
      role,
      objective: goal.goal,
      correlationId: requestId,
      metadata: goal.metadata,
      tenantId: goal.tenantId,
      plan: goal.plan,
      taskId: goal.taskId,
    });
    queuedJobs.push(jobId);
  }
  return {
    requestId,
    tasksPlanned: roles.length,
    tasksEnqueued: queuedJobs.length,
    queuedJobIds: queuedJobs,
    roles: roles.filter((role) => !skippedRoles.includes(role)),
  };
}
