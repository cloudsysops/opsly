import type { RouteContext } from '../router.js';
import {
  verifyPlatformAdminToken,
  parseBody,
  assertTenantSlugOrThrow,
  randomUUID,
} from '../utils.js';
import { enqueueJob } from '../../queue.js';
import type { OrchestratorJob } from '../../types.js';
import {
  getTerminalSession,
  stopTerminalSession,
  listTerminalSessions,
  readTerminalSessionOutput,
} from '../../workers/terminal-session-store.js';
import { jsonResponse, errorResponse } from '../router.js';

export async function handleStartTerminalTask(ctx: RouteContext): Promise<void> {
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
  const agentId = typeof b.agent_id === 'string' ? b.agent_id.trim() : '';
  const tenantSlug = typeof b.tenant_slug === 'string' ? b.tenant_slug.trim() : '';
  const commands = Array.isArray(b.commands)
    ? b.commands.filter((cmd): cmd is string => typeof cmd === 'string').map((cmd) => cmd.trim())
    : [];

  if (agentId.length === 0 || tenantSlug.length === 0 || commands.length === 0) {
    errorResponse(ctx.res, 400, 'agent_id, tenant_slug and commands[] are required');
    return;
  }
  try {
    assertTenantSlugOrThrow(tenantSlug);
  } catch (err) {
    errorResponse(ctx.res, 400, err instanceof Error ? err.message : String(err));
    return;
  }

  const timeoutSeconds =
    typeof b.timeout_seconds === 'number' && Number.isFinite(b.timeout_seconds)
      ? Math.floor(b.timeout_seconds)
      : undefined;
  const cwd = typeof b.cwd === 'string' && b.cwd.length > 0 ? b.cwd : undefined;
  const requestId =
    typeof b.request_id === 'string' && b.request_id.length > 0 ? b.request_id : randomUUID();

  const job: OrchestratorJob = {
    type: 'terminal_task',
    payload: {
      agent_id: agentId,
      tenant_slug: tenantSlug,
      commands,
      timeout_seconds: timeoutSeconds,
      cwd,
    },
    tenant_slug: tenantSlug,
    initiated_by: 'system',
    request_id: requestId,
    metadata: { labels: ['terminal', 'autonomous-agent'] },
  };

  try {
    const bull = await enqueueJob(job);
    jsonResponse(ctx.res, 202, {
      success: true,
      job_id: bull.id != null ? String(bull.id) : null,
      request_id: requestId,
      agent_id: agentId,
    });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}

export async function handleTerminalStatus(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }
  const agentId = ctx.params['agentId']?.trim() ?? '';
  if (agentId.length === 0) {
    errorResponse(ctx.res, 400, 'agent_id required');
    return;
  }
  const session = getTerminalSession(agentId);
  if (!session) {
    errorResponse(ctx.res, 404, 'session_not_found');
    return;
  }
  jsonResponse(ctx.res, 200, { success: true, session });
}

export async function handleTerminalStop(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }
  const agentId = ctx.params['agentId']?.trim() ?? '';
  if (agentId.length === 0) {
    errorResponse(ctx.res, 400, 'agent_id required');
    return;
  }
  const result = stopTerminalSession(agentId);
  if (!result.success) {
    errorResponse(ctx.res, 404, result.reason ?? 'session_not_found');
    return;
  }
  jsonResponse(ctx.res, 200, { success: true, agent_id: agentId, status: 'stopped' });
}

export async function handleTerminalListSessions(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }
  const agentId = ctx.params['agentId']?.trim() ?? '';
  if (agentId.length === 0) {
    errorResponse(ctx.res, 400, 'agent_id required');
    return;
  }
  const sessions = listTerminalSessions(agentId);
  jsonResponse(ctx.res, 200, { success: true, agent_id: agentId, sessions });
}

export async function handleTerminalSessionOutput(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }
  const agentId = ctx.params['agentId']?.trim() ?? '';
  const sessionId = ctx.params['sessionId']?.trim() ?? '';
  if (agentId.length === 0 || sessionId.length === 0) {
    errorResponse(ctx.res, 400, 'agent_id and session_id required');
    return;
  }
  const offsetRaw = ctx.query['offset'];
  const offset =
    typeof offsetRaw === 'string' && offsetRaw.length > 0 ? Number.parseInt(offsetRaw, 10) : 0;
  const output = readTerminalSessionOutput(
    agentId,
    sessionId,
    Number.isFinite(offset) ? offset : 0
  );
  jsonResponse(ctx.res, 200, {
    success: true,
    agent_id: agentId,
    session_id: sessionId,
    ...output,
  });
}

export async function handleTerminalSessionStop(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }
  const agentId = ctx.params['agentId']?.trim() ?? '';
  const sessionId = ctx.params['sessionId']?.trim() ?? '';
  if (agentId.length === 0 || sessionId.length === 0) {
    errorResponse(ctx.res, 400, 'agent_id and session_id required');
    return;
  }
  const result = stopTerminalSession(agentId, sessionId);
  if (!result.success) {
    errorResponse(ctx.res, 404, result.reason ?? 'session_not_found');
    return;
  }
  jsonResponse(ctx.res, 200, {
    success: true,
    agent_id: agentId,
    session_id: sessionId,
    status: 'stopped',
  });
}
