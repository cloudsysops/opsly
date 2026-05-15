import type { RouteContext } from '../router.js';
import { verifyPlatformAdminToken, parseBody, randomUUID } from '../utils.js';
import { jsonResponse, errorResponse } from '../router.js';
import {
  createBranchPlan,
  defaultChatOpsMvpTasks,
  assignWorkerToBranch,
  listBranchEntries,
  getBranchEntry,
  buildMergeAdvisorReport,
  dispatchChatOps,
  buildBranchHygieneReport,
  buildIntegrationMergeAdvisor,
  type ChatOpsAction,
  type ChatOpsDispatchInput,
} from '@intcloudsysops/git-branch-orchestrator';
import { resolveOpslyJobTypeForPrompt } from '../../lib/external-agent-coordinator.js';
import { enqueueLocalAgentJob } from '../../queue.js';
import type { OrchestratorJob } from '../../types.js';

function tenantFromBody(b: Record<string, unknown>): string {
  const raw = typeof b.tenant_slug === 'string' ? b.tenant_slug.trim() : '';
  return raw.length > 0 ? raw : 'local';
}

/** POST /api/git/branches/plan — ChatOps: create integration + agent branch plan */
export async function handleGitBranchPlan(ctx: RouteContext): Promise<void> {
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

  const initiative =
    typeof b.initiative === 'string' && b.initiative.trim().length > 0
      ? b.initiative.trim()
      : 'chatops-mvp';

  const usePreset = b.preset === 'chatops-mvp' || b.use_chatops_mvp_preset === true;

  let tasks = usePreset ? defaultChatOpsMvpTasks() : [];
  if (Array.isArray(b.tasks)) {
    tasks = b.tasks
      .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
      .map((t) => ({
        task_slug: String(t.task_slug ?? t.slug ?? ''),
        task_type: String(t.task_type ?? 'implementation'),
        title: typeof t.title === 'string' ? t.title : undefined,
        worker_id: typeof t.worker_id === 'string' ? t.worker_id : undefined,
      }))
      .filter((t) => t.task_slug.length > 0);
  }

  if (tasks.length === 0) {
    errorResponse(ctx.res, 400, 'tasks required (or preset chatops-mvp)');
    return;
  }

  try {
    const plan = await createBranchPlan({
      tenant_slug: tenantFromBody(b),
      initiative,
      tasks,
      parent_branch: typeof b.parent_branch === 'string' ? b.parent_branch : undefined,
      plan_only: b.materialize_git !== true,
    });

    jsonResponse(ctx.res, 200, {
      success: true,
      plan_only: b.materialize_git !== true,
      plan,
      message:
        'Branch plan registered. No git branches created until materialize_git or assign with materialize_git.',
    });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}

/** POST /api/git/branches/assign — assign worker + optional git + optional enqueue */
export async function handleGitBranchAssign(ctx: RouteContext): Promise<void> {
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

  const taskSlug = typeof b.task_slug === 'string' ? b.task_slug.trim() : '';
  if (taskSlug.length === 0) {
    errorResponse(ctx.res, 400, 'task_slug required');
    return;
  }

  const tenantSlug = tenantFromBody(b);
  const requestId =
    typeof b.request_id === 'string' && b.request_id.length > 0
      ? b.request_id
      : randomUUID();

  try {
    const assigned = await assignWorkerToBranch({
      tenant_slug: tenantSlug,
      initiative: typeof b.initiative === 'string' ? b.initiative : 'chatops-mvp',
      task_slug: taskSlug,
      task_type: typeof b.task_type === 'string' ? b.task_type : 'implementation',
      title: typeof b.title === 'string' ? b.title : undefined,
      worker_id: typeof b.worker_id === 'string' ? b.worker_id : undefined,
      session_id: typeof b.session_id === 'string' ? b.session_id : undefined,
      request_id: requestId,
      materialize_git: b.materialize_git === true,
      repo_path: typeof b.repo_path === 'string' ? b.repo_path : undefined,
      open_pr: b.open_pr === true,
    });

    let enqueue: { job_id: string | null; job_type: string } | null = null;
    if (b.enqueue_worker === true && typeof b.prompt_body === 'string') {
      const routed = await resolveOpslyJobTypeForPrompt({
        explicitAgent: assigned.opsly_job_type_hint,
        agentRole: assigned.entry.task_type,
      });
      const job: OrchestratorJob = {
        type: routed.opslyJobType as OrchestratorJob['type'],
        payload: {
          prompt_content: b.prompt_body,
          agent_role: assigned.entry.task_type,
          job_id: requestId,
          goal: assigned.entry.title ?? taskSlug,
          external_worker_id: routed.worker.workerId,
          model: routed.worker.defaultModel,
          branch: assigned.entry.branch_name,
        },
        tenant_slug: tenantSlug,
        initiated_by: 'system',
        request_id: requestId,
        metadata: {
          labels: ['git_branch_orchestrator', 'external_binary'],
          branch_registry_id: assigned.entry.id,
          branch_name: assigned.entry.branch_name,
        },
      };
      const bull = await enqueueLocalAgentJob(job);
      enqueue = {
        job_id: bull.id != null ? String(bull.id) : null,
        job_type: job.type,
      };
    }

    jsonResponse(ctx.res, 200, {
      success: true,
      assigned,
      enqueue,
    });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}

/** GET /api/git/branches/registry */
export async function handleGitBranchRegistry(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }
  const url = new URL(ctx.req.url ?? '/', 'http://localhost');
  const tenantSlug = url.searchParams.get('tenant_slug')?.trim() || 'local';
  try {
    const entries = await listBranchEntries(tenantSlug);
    jsonResponse(ctx.res, 200, {
      success: true,
      tenant_slug: tenantSlug,
      count: entries.length,
      entries,
    });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}

/** POST /api/git/chatops/dispatch */
export async function handleGitChatOpsDispatch(ctx: RouteContext): Promise<void> {
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
  const action = typeof b.action === 'string' ? (b.action as ChatOpsAction) : undefined;
  if (!action) {
    errorResponse(ctx.res, 400, 'action required');
    return;
  }
  const tenantSlug = tenantFromBody(b);
  try {
    const result = await dispatchChatOps({
      tenant_slug: tenantSlug,
      initiative: typeof b.initiative === 'string' ? b.initiative : undefined,
      action,
      task_slug: typeof b.task_slug === 'string' ? b.task_slug : undefined,
      task_type: typeof b.task_type === 'string' ? b.task_type : undefined,
      title: typeof b.title === 'string' ? b.title : undefined,
      worker_id: typeof b.worker_id === 'string' ? b.worker_id : undefined,
      message: typeof b.message === 'string' ? b.message : undefined,
      tasks: Array.isArray(b.tasks) ? (b.tasks as ChatOpsDispatchInput['tasks']) : undefined,
      materialize_git: b.materialize_git === true,
      open_pr: b.open_pr === true,
    });

    let enqueue: { job_id: string | null; job_type: string } | null = null;
    if (b.enqueue_worker === true && typeof b.prompt_body === 'string' && result.assign) {
      const requestId =
        typeof b.request_id === 'string' && b.request_id.length > 0
          ? b.request_id
          : randomUUID();
      const routed = await resolveOpslyJobTypeForPrompt({
        explicitAgent: result.assign.opsly_job_type_hint,
        agentRole: result.assign.entry.task_type,
      });
      const job: OrchestratorJob = {
        type: routed.opslyJobType as OrchestratorJob['type'],
        payload: {
          prompt_content: b.prompt_body,
          agent_role: result.assign.entry.task_type,
          job_id: requestId,
          goal: result.assign.entry.title ?? result.assign.entry.task_slug,
          external_worker_id: routed.worker.workerId,
          model: routed.worker.defaultModel,
          branch: result.assign.entry.branch_name,
        },
        tenant_slug: tenantSlug,
        initiated_by: 'system',
        request_id: requestId,
        metadata: {
          labels: ['git_branch_orchestrator', 'chatops'],
          branch_registry_id: result.assign.entry.id,
        },
      };
      const bull = await enqueueLocalAgentJob(job);
      enqueue = {
        job_id: bull.id != null ? String(bull.id) : null,
        job_type: job.type,
      };
    }

    jsonResponse(ctx.res, 200, { success: true, dispatch: result, enqueue });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}

/** GET /api/git/branches/hygiene */
export async function handleGitBranchHygiene(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }
  const url = new URL(ctx.req.url ?? '/', 'http://localhost');
  const tenantSlug = url.searchParams.get('tenant_slug')?.trim() || 'local';
  const initiative = url.searchParams.get('initiative')?.trim() || undefined;
  try {
    const hygiene = await buildBranchHygieneReport({ tenant_slug: tenantSlug, initiative });
    jsonResponse(ctx.res, 200, { success: true, hygiene });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}

/** GET /api/git/integration/:initiative/merge-advisor */
export async function handleGitIntegrationMergeAdvisor(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }
  const initiative = ctx.params.initiative;
  if (!initiative) {
    errorResponse(ctx.res, 400, 'initiative required');
    return;
  }
  const url = new URL(ctx.req.url ?? '/', 'http://localhost');
  const tenantSlug = url.searchParams.get('tenant_slug')?.trim() || 'local';
  try {
    const integration = await buildIntegrationMergeAdvisor({
      tenant_slug: tenantSlug,
      initiative,
    });
    jsonResponse(ctx.res, 200, {
      success: true,
      integration,
      human_approval_required: true,
      auto_merge_to_main: false,
    });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}

/** GET /api/git/branches/:id/merge-advisor */
export async function handleGitBranchMergeAdvisor(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }
  const id = ctx.params.id;
  if (!id) {
    errorResponse(ctx.res, 400, 'id required');
    return;
  }
  const url = new URL(ctx.req.url ?? '/', 'http://localhost');
  const tenantSlug = url.searchParams.get('tenant_slug')?.trim() || 'local';
  try {
    const entry = await getBranchEntry(tenantSlug, id);
    if (!entry) {
      errorResponse(ctx.res, 404, 'branch registry entry not found');
      return;
    }
    const report = await buildMergeAdvisorReport(entry);
    jsonResponse(ctx.res, 200, { success: true, entry, merge_advisor: report });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}
