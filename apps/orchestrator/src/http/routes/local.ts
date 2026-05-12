import type { IncomingMessage, ServerResponse } from 'node:http';
import { jsonResponse, errorResponse } from '../router.js';
import { parseBody } from '../router.js';
import { verifyPlatformAdminToken, assertTenantSlugOrThrow, randomUUID } from '../utils.js';
import {
  getLocalControlMode,
  listLocalControlModes,
  parseControlMode,
  setLocalControlMode,
} from '../../control-mode.js';
import { getAgentServiceRegistry, type AgentService } from '../../lib/agent-service-registry.js';
import {
  isLocalAgentKind,
  jobTypeForLocalAgent,
  normalizeLocalAgentKind,
} from '../../lib/local-worker-utils.js';
import { enqueueLocalAgentJob } from '../../queue.js';
import { recordOpenClawIntentQueued } from '../../openclaw/runtime-events.js';
import type { OrchestratorJob } from '../../types.js';
import { resolveAutonomyPolicy } from '../../autonomy/policy.js';
import { hasExplicitAutonomyApproval } from '../utils.js';

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

function resolveLocalPromptAgentKind(body: Record<string, unknown>, prompt: string): string {
  if (typeof body.agent === 'string' && isLocalAgentKind(body.agent)) {
    return normalizeLocalAgentKind(body.agent);
  }
  const p = prompt.toLowerCase();
  if (p.includes('cursor')) return 'cursor';
  if (p.includes('claude')) return 'claude';
  if (p.includes('copilot')) return 'copilot';
  if (p.includes('opencode')) return 'opencode';
  return 'cursor';
}

export async function handleLocalControlMode(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  if (!verifyPlatformAdminToken(req)) {
    return errorResponse(res, 'unauthorized', 401);
  }
  let body: unknown;
  try {
    body = await parseBody(req);
  } catch {
    return errorResponse(res, 'Invalid JSON', 400);
  }
  const mode =
    typeof body === 'object' && body !== null
      ? parseControlMode((body as Record<string, unknown>).mode)
      : 'opsly_control';
  setLocalControlMode(mode);
  return jsonResponse(res, { success: true, mode, allowed_modes: listLocalControlModes() });
}

export async function handleLocalState(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  if (!verifyPlatformAdminToken(req)) {
    return errorResponse(res, 'unauthorized', 401);
  }
  try {
    const registry = getAgentServiceRegistry();
    const config = await registry.getConfig();
    const agents = Object.entries(config.services).map(([name, service]) => {
      const s = service as AgentService;
      return {
        name: normalizeLocalAgentKind(name),
        enabled: s.enabled,
        url: s.url,
        type: s.type,
        job_type: jobTypeForLocalAgent(normalizeLocalAgentKind(name)),
        capabilities: s.capabilities ?? [],
      };
    });
    return jsonResponse(res, {
      success: true,
      control_mode: getLocalControlMode(),
      allowed_modes: listLocalControlModes(),
      agents,
      jobs_recent: recentLocalJobs,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    return errorResponse(res, String(err), 500);
  }
}

export async function handleLocalPromptSubmit(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  if (!verifyPlatformAdminToken(req)) {
    return errorResponse(res, 'unauthorized', 401);
  }
  let body: unknown;
  try {
    body = await parseBody(req);
  } catch {
    return errorResponse(res, 'Invalid JSON', 400);
  }
  if (typeof body !== 'object' || body === null) {
    return errorResponse(res, 'invalid body', 400);
  }
  const b = body as Record<string, unknown>;
  const promptContentRaw = typeof b.prompt_content === 'string' ? b.prompt_content.trim() : '';
  const promptBody = typeof b.prompt_body === 'string' ? b.prompt_body.trim() : '';
  const promptForWorker = promptContentRaw.length > 0 ? promptContentRaw : promptBody;
  const promptForAgentResolve = promptContentRaw.length > 0 ? promptContentRaw : '';

  if (promptForWorker.length === 0) {
    return errorResponse(res, 'prompt_body or prompt_content required', 400);
  }

  const tenantSlugRaw = typeof b.tenant_slug === 'string' ? b.tenant_slug.trim() : '';
  const tenantSlug = tenantSlugRaw.length > 0 ? tenantSlugRaw : 'local';
  try {
    assertTenantSlugOrThrow(tenantSlug);
  } catch (err) {
    return errorResponse(res, err instanceof Error ? err.message : String(err), 400);
  }

  const agentRole = (typeof b.agent_role === 'string' ? b.agent_role : 'executor').trim();
  const goal = typeof b.goal === 'string' ? b.goal.trim() : '';
  const maxSteps =
    typeof b.max_steps === 'number' && Number.isFinite(b.max_steps)
      ? Math.floor(b.max_steps)
      : 10;
  const context =
    typeof b.context === 'object' && b.context !== null
      ? (b.context as Record<string, unknown>)
      : {};
  const requestId =
    (typeof b.request_id === 'string' && b.request_id.length > 0) ? b.request_id : randomUUID();

  const agentKind = resolveLocalPromptAgentKind(b, promptForAgentResolve);
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
    },
    tenant_slug: tenantSlug,
    initiated_by: 'system',
    request_id: requestId,
    metadata: { labels: ['local_prompt'] },
  };
  const controlMode = getLocalControlMode();

  try {
    const policy = resolveAutonomyPolicy(job.type, job.autonomy_risk);
    if (policy.requiresApproval && !hasExplicitAutonomyApproval(req)) {
      return jsonResponse(res, { error: 'autonomy_approval_required', autonomy_risk: policy.riskLevel }, 403);
    }

    if (controlMode === 'ide_fallback') {
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
      return jsonResponse(res, {
        success: true,
        ok: true,
        job_type: job.type,
        job_id: null,
        request_id: requestId,
        control_mode: controlMode,
        prepared_only: true,
      }, 202);
    }

    const bull = await enqueueLocalAgentJob(job);
    const bullJobId = bull.id != null ? String(bull.id) : null;
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
    recordOpenClawIntentQueued({
      requestId,
      intent: `execute_${job.type}`,
      tenantSlug,
      jobId: bullJobId,
    });
    return jsonResponse(res, {
      success: true,
      ok: true,
      job_type: job.type,
      job_id: bullJobId,
      request_id: requestId,
      control_mode: controlMode,
    }, 202);
  } catch (err) {
    return errorResponse(res, String(err), 500);
  }
}