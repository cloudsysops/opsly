import type { RouteContext } from '../router.js';
import { verifyPlatformAdminToken, parseBody, assertTenantSlugOrThrow, enrichAutonomyMetadata, randomUUID } from '../utils.js';
import { enqueueJob, enqueueLocalAgentJob, RuntimeGovernorRejectedError } from '../../queue.js';
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
import { resolveOpslyJobTypeForPrompt } from '../../lib/external-agent-coordinator.js';
import { jsonResponse, errorResponse } from '../router.js';

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

function explicitAgentFromBody(
  b: Record<string, unknown>,
  promptForFrontmatter: string,
): string | undefined {
  const explicit = typeof b.agent === 'string' ? b.agent.trim() : '';
  if (explicit.length > 0) {
    return explicit;
  }
  if (promptForFrontmatter.length > 0) {
    const { metadata } = parsePromptFrontmatter(promptForFrontmatter);
    const fromFm = metadata.agent;
    if (typeof fromFm === 'string' && fromFm.trim().length > 0) {
      return fromFm.trim();
    }
  }
  const role = typeof b.agent_role === 'string' ? b.agent_role.trim().toLowerCase() : '';
  if (isLocalAgentKind(role)) {
    return role;
  }
  return undefined;
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
    typeof b.context === 'object' && b.context !== null ? (b.context as Record<string, unknown>) : {};
  const requestId = typeof b.request_id === 'string' && b.request_id.length > 0 ? b.request_id : randomUUID();

  const explicitAgent = explicitAgentFromBody(b, promptForAgentResolve);
  const routed = await resolveOpslyJobTypeForPrompt({
    explicitAgent,
    agentRole,
    goal,
    intent: typeof b.intent === 'string' ? b.intent : undefined,
  });
  const agentKind = routed.opslyJobType;
  const jobType = jobTypeForLocalAgent(agentKind);

  const job: OrchestratorJob = {
    type: jobType as OrchestratorJob['type'],
    payload: {
      prompt_content: promptForWorker,
      agent_role: agentRole,
      max_steps: maxSteps,
      goal,
      context,
      job_id: requestId,
      model: routed.worker.defaultModel,
      external_worker_id: routed.worker.workerId,
      external_command: routed.worker.command,
    },
    tenant_slug: tenantSlug,
    initiated_by: 'system',
    request_id: requestId,
    metadata: {
      labels: ['local_prompt', 'external_binary'],
      external_worker_id: routed.worker.workerId,
      default_model: routed.worker.defaultModel,
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
        external_worker_id: routed.worker.workerId,
        opsly_job_type: agentKind,
      });
      return;
    }

    const bull = await enqueueLocalAgentJob(job);
    const bullJobId = bull.id != null ? String(bull.id) : null;
    console.log(`[LocalPromptSubmit] Enqueued ${job.type} job ${bull.id} (${agentKind}) to local-agents queue`);
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
      external_worker_id: routed.worker.workerId,
      opsly_job_type: agentKind,
      default_model: routed.worker.defaultModel,
    });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}
