import type { RouteContext } from '../router.js';
import { jsonResponse, errorResponse } from '../router.js';
import { parseBody, verifyPlatformAdminToken } from '../utils.js';
import { listSessions } from '@intcloudsysops/session-manager';

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

  const sessions = await listSessions();
  const sessionCount = sessions.length;
  const reply =
    message.toLowerCase().includes('continue runtime work')
      ? 'Continuing runtime work: session routing is online.'
      : 'Mission Control chat is online.';

  jsonResponse(ctx.res, 200, {
    ok: true,
    role: 'assistant',
    reply,
    summary: `${sessionCount} active session(s) visible to Mission Control`,
    proposals: [],
    worker_recommendation: {
      workerId: 'codex-cli',
      opslyJobType: 'local_codex',
      rationale: 'Default runtime worker for implementation follow-up',
    },
    human_approval_required: false,
  });
}
