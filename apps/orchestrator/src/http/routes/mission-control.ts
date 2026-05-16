import type { RouteContext } from '../router.js';
import { jsonResponse, errorResponse } from '../router.js';
import { parseBody, verifyPlatformAdminToken } from '../utils.js';
import { routeSessions } from '../../lib/session-routing/router.js';
import { selectWorker } from '../../lib/worker-selection/select-worker.js';

function requireAdmin(ctx: RouteContext): boolean {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return false;
  }
  return true;
}

export async function handleMissionControlChat(ctx: RouteContext): Promise<void> {
  if (!requireAdmin(ctx)) {
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

  const record = body as Record<string, unknown>;
  const message = typeof record.message === 'string' ? record.message.trim() : '';
  if (message.length === 0) {
    errorResponse(ctx.res, 400, 'message required');
    return;
  }

  const tenantSlug = typeof record.tenant_slug === 'string' ? record.tenant_slug : undefined;
  const workspace = typeof record.workspace === 'string' ? record.workspace : undefined;
  const branch = typeof record.branch === 'string' ? record.branch : undefined;
  const intent = typeof record.intent === 'string' ? record.intent : message;
  const explicitAgent = typeof record.agent === 'string' ? record.agent : undefined;

  try {
    const routing = await routeSessions({ message, tenantSlug, workspace, branch });
    const worker = await selectWorker({
      intent,
      explicitAgent,
      agentRole: typeof record.agent_role === 'string' ? record.agent_role : undefined,
      risk:
        record.risk === 'low' || record.risk === 'medium' || record.risk === 'high'
          ? record.risk
          : undefined,
      writeRequired: record.write_required === true,
    });

    jsonResponse(ctx.res, 200, {
      ok: true,
      role: 'assistant',
      reply: routing.message,
      summary: routing.summary,
      proposals: routing.proposals,
      worker_recommendation: worker,
      human_approval_required: worker.needsApproval,
    });
  } catch (err) {
    errorResponse(ctx.res, 500, err instanceof Error ? err.message : String(err));
  }
}
