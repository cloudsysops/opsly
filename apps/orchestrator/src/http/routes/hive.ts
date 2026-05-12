import type { RouteContext } from '../router.js';
import { verifyPlatformAdminToken, parseBody, assertTenantSlugOrThrow, enrichAutonomyMetadata, randomUUID } from '../utils.js';
import { enqueueJob } from '../../queue.js';
import {
  initializeHiveHandler,
  handleSubmitObjective,
  handleGetObjectiveStatus,
  handleListActiveBots,
  handleGetHiveStats,
  handleShutdownHive,
  handleRetrySubtask,
} from '../../hive/http-handler.js';
import type { OrchestratorJob } from '../../types.js';
import { jsonResponse, errorResponse } from '../router.js';

export async function handleHiveObjective(ctx: RouteContext): Promise<void> {
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
  const objective = typeof b.objective === 'string' ? b.objective.trim() : '';
  const tenantSlug = typeof b.tenant_slug === 'string' ? b.tenant_slug.trim() : '';
  const requestId =
    typeof b.request_id === 'string' && b.request_id.length > 0 ? b.request_id : randomUUID();
  if (objective.length === 0 || tenantSlug.length === 0) {
    errorResponse(ctx.res, 400, 'objective and tenant_slug required');
    return;
  }
  try {
    assertTenantSlugOrThrow(tenantSlug);
  } catch (err) {
    errorResponse(ctx.res, 400, err instanceof Error ? err.message : String(err));
    return;
  }
  const job: OrchestratorJob = {
    type: 'hive_objective',
    payload: { objective, tenant_slug: tenantSlug, request_id: requestId },
    tenant_slug: tenantSlug,
    initiated_by: 'system',
    request_id: requestId,
    metadata: { labels: ['hive', 'swarmops', 'queen'] },
  };

  try {
    const policyCheck = enrichAutonomyMetadata(ctx.req, job);
    if (!policyCheck.ok) {
      jsonResponse(ctx.res, policyCheck.status, policyCheck.payload);
      return;
    }
    const bull = await enqueueJob(job);
    jsonResponse(ctx.res, 202, { success: true, taskId: bull.id != null ? String(bull.id) : null, request_id: requestId });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}

export async function handleHiveObjectiveStatus(ctx: RouteContext): Promise<void> {
  const taskId = ctx.params['taskId'] ?? '';
  await handleGetObjectiveStatus(ctx.req, ctx.res, taskId);
}

export async function handleHiveRetrySubtask(ctx: RouteContext): Promise<void> {
  const taskId = ctx.params['taskId'] ?? '';
  const subtaskId = ctx.params['subtaskId'] ?? '';
  await handleRetrySubtask(ctx.req, ctx.res, taskId, subtaskId);
}

export async function handleHiveBots(ctx: RouteContext): Promise<void> {
  await handleListActiveBots(ctx.req, ctx.res);
}

export async function handleHiveStats(ctx: RouteContext): Promise<void> {
  await handleGetHiveStats(ctx.req, ctx.res);
}

export async function handleHiveShutdown(ctx: RouteContext): Promise<void> {
  await handleShutdownHive(ctx.req, ctx.res);
}

export async function handleHiveInit(ctx: RouteContext): Promise<void> {
  try {
    await initializeHiveHandler();
    jsonResponse(ctx.res, 200, { status: 'hive initialized' });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}
