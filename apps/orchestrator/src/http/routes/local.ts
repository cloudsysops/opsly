import type { RouteContext } from '../router.js';
import { verifyPlatformAdminToken, parseBody, assertTenantSlugOrThrow, enrichAutonomyMetadata, randomUUID } from '../utils.js';
import {
  enqueueLocalAgentJob,
  getLocalAgentJobById,
  localAgentJobIdFor,
  probeLocalAgentQueue,
} from '../../queue.js';
import type { OrchestratorJob } from '../../types.js';
import {
  getLocalControlMode,
  listLocalControlModes,
  parseControlMode,
  setLocalControlMode,
} from '../../control-mode.js';
import { getAgentServiceRegistry, type AgentService } from '../../lib/agent/agent-service-registry.js';
import {
  isLocalAgentKind,
  jobTypeForLocalAgent,
  normalizeLocalAgentKind,
  parsePromptFrontmatter,
  externalCliLabelForOpslyLocalAgent,
  isConfigurableLocalBridgeKey,
} from '../../lib/local-worker-utils.js';
import { recordOpenClawIntentQueued } from '../../openclaw/runtime-events.js';
import { jsonResponse, errorResponse } from '../router.js';
import { agentTaskEnvelopeV1Schema } from '@intcloudsysops/types/agent-task';
import { buildAgentTaskEnvelope, inferTaskType } from '@intcloudsysops/agent-task-core';
import {
  acquireTaskDispatchClaim,
  dispatchClaimRequestFromContext,
  readDispatchAttemptHistory,
  releaseTaskDispatchClaim,
  type DispatchClaimLease,
} from '../../task-claim-store.js';

const MAX_RECENT_LOCAL_JOBS = 25;

interface LocalRecentJob {
  request_id: string;
  job_id: string | null;
  agent: string;
  job_type: string;
  tenant_slug: string;
  control_mode: string;
  status: 'queued' | 'prepared';
  submitted_at: string;
}

const recentLocalJobs: LocalRecentJob[] = [];

function recordRecentLocalJob(job: LocalRecentJob): void {
  recentLocalJobs.unshift(job);
  if (recentLocalJobs.length > MAX_RECENT_LOCAL_JOBS) {
    recentLocalJobs.splice(MAX_RECENT_LOCAL_JOBS);
  }
}

function resolveLocalPromptAgentKind(b: Record<string, unknown>, promptForFrontmatter: string): string {
  const explicit = typeof b.agent === 'string' ? b.agent.trim() : '';
  if (explicit.length > 0) {
    return normalizeLocalAgentKind(explicit);
  }
  if (promptForFrontmatter.length > 0) {
    const { metadata } = parsePromptFrontmatter(promptForFrontmatter);
    const fromFm = metadata.agent;
    if (typeof fromFm === 'string' && fromFm.trim().length > 0) {
      return normalizeLocalAgentKind(fromFm);
    }
  }
  const role = typeof b.agent_role === 'string' ? b.agent_role.trim().toLowerCase() : '';
  if (isLocalAgentKind(role)) {
    return normalizeLocalAgentKind(role);
  }
  return 'local_cursor';
}

export async function handleLocalControlMode(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }
  let body: unknown;
  try {
    body = await parseBody(ctx.req);
  } catch {
    errorResponse(ctx.res, 400, 'Invalid JSON');
    return;
  }
  const mode =
    typeof body === 'object' && body !== null
      ? parseControlMode((body as Record<string, unknown>).mode)
      : 'opsly_control';
  setLocalControlMode(mode);
  jsonResponse(ctx.res, 200, { success: true, mode, allowed_modes: listLocalControlModes() });
}

export async function handleLocalState(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }
  try {
    const registry = getAgentServiceRegistry();
    const config = await registry.getConfig();
    const agents = Object.entries(config.services)
      .filter(([name]) => isConfigurableLocalBridgeKey(name))
      .map(([name, service]) => {
      const s = service as AgentService;
      const legacy = service as unknown as { endpoint?: string };
      const raw = service as unknown as { external_cli?: string };
      const agentKind = normalizeLocalAgentKind(name);
      const externalFromConfig = typeof raw.external_cli === 'string' ? raw.external_cli.trim() : '';
      const external_cli =
        externalFromConfig.length > 0 ? externalFromConfig : externalCliLabelForOpslyLocalAgent(agentKind);
      return {
        id: agentKind,
        name: agentKind,
        external_cli,
        enabled: s.enabled,
        url: s.url ?? legacy.endpoint,
        type: s.type,
        job_type: jobTypeForLocalAgent(agentKind),
        capabilities: s.capabilities ?? [],
      };
    });
    jsonResponse(ctx.res, 200, {
      success: true,
      control_mode: getLocalControlMode(),
      allowed_modes: listLocalControlModes(),
      agents,
      jobs_recent: recentLocalJobs,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}

export async function handleLocalDispatchAttempts(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }

  const taskId = ctx.query.task_id?.trim() ?? '';
  if (!taskId) {
    errorResponse(ctx.res, 400, 'task_id query parameter required');
    return;
  }

  const tenantSlug = ctx.query.tenant_slug?.trim() || 'local';
  try {
    assertTenantSlugOrThrow(tenantSlug);
  } catch (err) {
    errorResponse(ctx.res, 400, err instanceof Error ? err.message : String(err));
    return;
  }

  try {
    const attempts = await readDispatchAttemptHistory({ tenantSlug, taskId });
    jsonResponse(ctx.res, 200, {
      success: true,
      tenant_slug: tenantSlug,
      task_id: taskId,
      attempt_count: attempts.length,
      attempts,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    errorResponse(ctx.res, 500, err instanceof Error ? err.message : String(err));
  }
}

export async function handleLocalQueueHealth(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }
  try {
    const probe = await probeLocalAgentQueue();
    if (!probe.ok) {
      jsonResponse(ctx.res, 503, probe);
      return;
    }
    jsonResponse(ctx.res, 200, probe);
  } catch (err) {
    jsonResponse(ctx.res, 503, {
      ok: false,
      queue: 'local-agents',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function handleLocalPromptSubmit(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }
  let body: unknown;
  try {
    body = await parseBody(ctx.req);
  } catch {
    errorResponse(ctx.res, 400, 'Invalid JSON');
    return;
  }
  if (typeof body !== 'object' || body === null) {
    errorResponse(ctx.res, 400, 'invalid body');
    return;
  }
  const b = body as Record<string, unknown>;
  const promptContentRaw = typeof b.prompt_content === 'string' ? b.prompt_content.trim() : '';
  const promptBody = typeof b.prompt_body === 'string' ? b.prompt_body.trim() : '';
  const promptForWorker = promptContentRaw.length > 0 ? promptContentRaw : promptBody;
  const promptForAgentResolve = promptContentRaw.length > 0 ? promptContentRaw : '';

  if (promptForWorker.length === 0) {
    errorResponse(ctx.res, 400, 'prompt_body or prompt_content required');
    return;
  }

  const tenantSlugRaw = typeof b.tenant_slug === 'string' ? b.tenant_slug.trim() : '';
  const tenantSlug = tenantSlugRaw.length > 0 ? tenantSlugRaw : 'local';
  try {
    assertTenantSlugOrThrow(tenantSlug);
  } catch (err) {
    errorResponse(ctx.res, 400, err instanceof Error ? err.message : String(err));
    return;
  }

  const agentRole = (typeof b.agent_role === 'string' ? b.agent_role : 'executor').trim();
  const goal = typeof b.goal === 'string' ? b.goal.trim() : '';
  const maxSteps = typeof b.max_steps === 'number' && Number.isFinite(b.max_steps) ? Math.floor(b.max_steps) : 10;
  const context =
    typeof b.context === 'object' && b.context !== null ? { ...(b.context as Record<string, unknown>) } : {};
  // Claim leases are server-owned capabilities. Never trust caller-supplied release metadata.
  delete context.dispatch_claim;
  const requestId = typeof b.request_id === 'string' && b.request_id.length > 0 ? b.request_id : randomUUID();

  let dispatchClaimRequest: ReturnType<typeof dispatchClaimRequestFromContext> = null;
  try {
    dispatchClaimRequest = dispatchClaimRequestFromContext({
      context,
      tenantSlug,
      requestId,
    });
  } catch (err) {
    errorResponse(ctx.res, 400, err instanceof Error ? err.message : String(err));
    return;
  }

  const agentKind = resolveLocalPromptAgentKind(b, promptForAgentResolve);
  const jobType = jobTypeForLocalAgent(agentKind);

  const taskEnvelopeRaw = b.agent_task;
  const taskEnvelopeResult =
    taskEnvelopeRaw === undefined ? null : agentTaskEnvelopeV1Schema.safeParse(taskEnvelopeRaw);
  if (taskEnvelopeResult && !taskEnvelopeResult.success) {
    errorResponse(
      ctx.res,
      400,
      `invalid AgentTaskEnvelopeV1: ${taskEnvelopeResult.error.issues[0]?.message ?? 'invalid envelope'}`
    );
    return;
  }

  const roleHint = agentRole.trim().toLowerCase();
  const inferredType = inferTaskType(
    promptForWorker,
    roleHint.includes('plan')
      ? 'planning'
      : roleHint.includes('review')
        ? 'review'
        : roleHint.includes('debug')
          ? 'code'
          : roleHint.includes('build') || roleHint.includes('implement')
            ? 'code'
            : undefined
  );
  const requiresPr = context.requires_pr === true;
  const inferredWriteAllowed =
    requiresPr ||
    roleHint.includes('build') ||
    roleHint.includes('implement') ||
    roleHint.includes('debug');
  const writeAllowed = taskEnvelopeResult?.success
    ? taskEnvelopeResult.data.constraints.write_allowed === true
    : inferredWriteAllowed;

  const taskEnvelope = taskEnvelopeResult?.success
    ? taskEnvelopeResult.data
    : buildAgentTaskEnvelope({
        task: promptForWorker,
        tenantSlug,
        taskType: inferredType,
        selectedAgent: jobType,
        requestedAgent: agentKind,
        requestId,
        correlationId:
          typeof b.correlation_id === 'string' && b.correlation_id.trim().length > 0
            ? b.correlation_id.trim()
            : requestId,
        executionMode: 'enqueue',
        localOnly: true,
        writeAllowed,
        source: 'local-prompt-submit',
        actor: 'system',
        metadata: {
          generated_by: 'orchestrator',
          agent_role: agentRole,
          goal,
          requires_pr: requiresPr,
          ...context,
        },
      });

  if (taskEnvelopeResult?.success && taskEnvelope.task.trim() !== promptForWorker.trim()) {
    errorResponse(
      ctx.res,
      400,
      'AgentTaskEnvelopeV1 task must exactly match the prompt that will be executed'
    );
    return;
  }

  if (
    taskEnvelope.tenant_slug !== tenantSlug ||
    taskEnvelope.request_id !== requestId ||
    taskEnvelope.selected_agent !== jobType
  ) {
    errorResponse(
      ctx.res,
      400,
      'AgentTaskEnvelopeV1 tenant_slug/request_id/selected_agent mismatch'
    );
    return;
  }

  if (writeAllowed && !dispatchClaimRequest) {
    errorResponse(
      ctx.res,
      400,
      'DISPATCH_CLAIM_REQUIRED: write-capable agent work requires workstream + conflict_key before execution'
    );
    return;
  }

  const job: OrchestratorJob = {
    type: jobType as OrchestratorJob['type'],
    payload: {
      prompt_content: promptForWorker,
      agent_role: agentRole,
      max_steps: maxSteps,
      goal,
      context,
      agent_task: taskEnvelope,
      job_id: requestId,
    },
    taskId: dispatchClaimRequest?.taskId,
    tenant_slug: tenantSlug,
    initiated_by: 'system',
    request_id: requestId,
    idempotency_key: requestId,
    metadata: {
      labels: ['local_prompt'],
      ...(dispatchClaimRequest
        ? {
            workstream: dispatchClaimRequest.workstream,
            conflict_key: dispatchClaimRequest.conflictKey,
            semantic_scope: dispatchClaimRequest.semanticScope ?? null,
            affected_paths: dispatchClaimRequest.affectedPaths,
          }
        : {}),
    },
  };
  const controlMode = getLocalControlMode();

  try {
    const policyCheck = enrichAutonomyMetadata(ctx.req, job);
    if (!policyCheck.ok) {
      jsonResponse(ctx.res, policyCheck.status, policyCheck.payload);
      return;
    }

    if (controlMode === 'ide_fallback') {
      console.log(`[LocalPromptSubmit] Prepared ${job.type} job ${requestId} (${agentKind}) for manual IDE fallback`);
      recordRecentLocalJob({
        request_id: requestId,
        job_id: null,
        agent: agentKind,
        job_type: job.type,
        tenant_slug: tenantSlug,
        control_mode: controlMode,
        status: 'prepared',
        submitted_at: new Date().toISOString(),
      });
      jsonResponse(ctx.res, 202, {
        success: true,
        ok: true,
        job_type: job.type,
        job_id: null,
        request_id: requestId,
        control_mode: controlMode,
        prepared_only: true,
      });
      return;
    }

    if (dispatchClaimRequest) {
      const intendedJobId = localAgentJobIdFor(job);
      if (intendedJobId) {
        const existingJob = await getLocalAgentJobById(intendedJobId);
        if (existingJob) {
          const existingState = await existingJob.getState();
          if (existingState === 'failed') {
            await existingJob.remove();
          } else {
            const decision =
              existingState === 'completed' ? 'ALREADY_DONE' : 'JOIN_EXISTING';
            jsonResponse(ctx.res, 409, {
              success: false,
              ok: false,
              error: 'DISPATCH_JOB_ALREADY_EXISTS',
              dispatch_decision: decision,
              existing_job_id: intendedJobId,
              existing_task_id: dispatchClaimRequest.taskId,
              existing_workstream: dispatchClaimRequest.workstream,
              request_id: requestId,
              existing_state: existingState,
            });
            return;
          }
        }
      }
    }

    let dispatchClaimLease: DispatchClaimLease | null = null;
    if (dispatchClaimRequest) {
      const claim = await acquireTaskDispatchClaim(dispatchClaimRequest);
      if (!claim.acquired) {
        jsonResponse(ctx.res, 409, {
          success: false,
          ok: false,
          error: 'DISPATCH_SCOPE_ALREADY_OWNED',
          dispatch_decision: claim.conflict.decision,
          conflict_dimension: claim.conflict.descriptor.dimension,
          conflict_scope: claim.conflict.descriptor.value,
          existing_claim_id: claim.conflict.existingClaimId,
          existing_task_id: claim.conflict.existingTaskId,
          existing_workstream: claim.conflict.existingWorkstream,
          request_id: requestId,
        });
        return;
      }
      dispatchClaimLease = claim.lease;
      context.dispatch_claim = dispatchClaimLease;
      job.metadata = {
        ...job.metadata,
        dispatch_claim_id: dispatchClaimLease.claimId,
        dispatch_claim_expires_at: dispatchClaimLease.expiresAt,
      };

      const ownershipHeader = [
        '[OPSLY DISPATCH OWNERSHIP — TRUSTED CONTROL METADATA]',
        `claim_id=${dispatchClaimLease.claimId}`,
        `task_id=${dispatchClaimLease.taskId}`,
        `workstream=${dispatchClaimLease.workstream}`,
        `conflict_key=${dispatchClaimRequest.conflictKey}`,
        dispatchClaimRequest.semanticScope
          ? `semantic_scope=${dispatchClaimRequest.semanticScope}`
          : null,
        dispatchClaimRequest.affectedPaths.length > 0
          ? `affected_paths=${dispatchClaimRequest.affectedPaths.join(',')}`
          : null,
        'Do not start a parallel branch/worktree/task for this owned scope. Reuse the existing claim until terminal completion.',
        '[/OPSLY DISPATCH OWNERSHIP]',
      ]
        .filter((line): line is string => typeof line === 'string')
        .join('\n');
      job.payload.prompt_content = `${ownershipHeader}\n\n${promptForWorker}`;
    }

    let bull;
    try {
      bull = await enqueueLocalAgentJob(job);
    } catch (err) {
      if (dispatchClaimLease) {
        await releaseTaskDispatchClaim(dispatchClaimLease).catch(() => undefined);
      }
      throw err;
    }

    const bullJobId = bull.id != null && String(bull.id).trim().length > 0 ? String(bull.id) : null;
    if (!bullJobId) {
      if (dispatchClaimLease) {
        await releaseTaskDispatchClaim(dispatchClaimLease).catch(() => undefined);
      }
      throw new Error('BULLMQ_JOB_ID_REQUIRED: enqueue returned no durable job id');
    }
    console.log(`[LocalPromptSubmit] Enqueued ${job.type} job ${bullJobId} (${agentKind}) to local-agents queue`);
    recordRecentLocalJob({
      request_id: requestId,
      job_id: bullJobId,
      agent: agentKind,
      job_type: job.type,
      tenant_slug: tenantSlug,
      control_mode: controlMode,
      status: 'queued',
      submitted_at: new Date().toISOString(),
    });
    recordOpenClawIntentQueued({ requestId, intent: `execute_${job.type}`, tenantSlug, jobId: bullJobId });
    jsonResponse(ctx.res, 202, {
      success: true,
      ok: true,
      job_type: job.type,
      job_id: bullJobId,
      request_id: requestId,
      control_mode: controlMode,
      ...(dispatchClaimLease
        ? {
            dispatch_claim: {
              version: dispatchClaimLease.version,
              claim_id: dispatchClaimLease.claimId,
              task_id: dispatchClaimLease.taskId,
              workstream: dispatchClaimLease.workstream,
              expires_at: dispatchClaimLease.expiresAt,
            },
          }
        : {}),
    });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}
