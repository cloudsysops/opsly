import {
  captureLogs,
  checkpointSession,
  createSession,
  listSessions,
  sendCommand,
  stopSession,
} from '@intcloudsysops/session-manager';
import type { RouteContext } from '../router.js';
import { jsonResponse, errorResponse } from '../router.js';
import { parseBody, verifyPlatformAdminToken } from '../utils.js';

function requireAdmin(ctx: RouteContext): boolean {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return false;
  }
  return true;
}

export async function handleRuntimeHealth(ctx: RouteContext): Promise<void> {
  const sessions = await listSessions();
  jsonResponse(ctx.res, 200, {
    ok: true,
    service: 'opsly-runtime',
    session_count: sessions.length,
    dry_run: process.env.OPSLY_RUNTIME_DRY_RUN === 'true',
  });
}

export async function handleRuntimeListSessions(ctx: RouteContext): Promise<void> {
  if (!requireAdmin(ctx)) {
    return;
  }
  const sessions = await listSessions();
  jsonResponse(ctx.res, 200, { ok: true, sessions });
}

export async function handleRuntimeCreateSession(ctx: RouteContext): Promise<void> {
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
  const b = body as Record<string, unknown>;
  const name = typeof b.name === 'string' ? b.name : 'runtime';
  const agentId = typeof b.agentId === 'string' ? b.agentId : 'orchestrator';
  const workspace =
    typeof b.workspace === 'string' ? b.workspace : process.env.OPSLY_ROOT ?? '/opt/opsly';
  const jobId = typeof b.jobId === 'string' ? b.jobId : undefined;
  const branch = typeof b.branch === 'string' ? b.branch : undefined;
  const initialCommand = typeof b.initialCommand === 'string' ? b.initialCommand : undefined;
  try {
    const session = await createSession({
      name,
      agentId,
      jobId,
      workspace,
      branch,
      initialCommand,
    });
    jsonResponse(ctx.res, 201, { ok: true, session });
  } catch (err) {
    errorResponse(ctx.res, 400, err instanceof Error ? err.message : String(err));
  }
}

export async function handleRuntimeSessionLogs(ctx: RouteContext): Promise<void> {
  if (!requireAdmin(ctx)) {
    return;
  }
  const sessionId = ctx.params.sessionId ?? '';
  try {
    const output = await captureLogs(sessionId);
    jsonResponse(ctx.res, 200, { ok: true, sessionId, output });
  } catch (err) {
    errorResponse(ctx.res, 404, err instanceof Error ? err.message : String(err));
  }
}

export async function handleRuntimeSessionSend(ctx: RouteContext): Promise<void> {
  if (!requireAdmin(ctx)) {
    return;
  }
  const sessionId = ctx.params.sessionId ?? '';
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
  const command = typeof b.command === 'string' ? b.command : '';
  const dryRun = b.dryRun === true;
  if (command.length === 0) {
    errorResponse(ctx.res, 400, 'command required');
    return;
  }
  try {
    const result = await sendCommand({ sessionId, command, dryRun });
    jsonResponse(ctx.res, 200, { ok: true, ...result });
  } catch (err) {
    errorResponse(ctx.res, 400, err instanceof Error ? err.message : String(err));
  }
}

export async function handleRuntimeSessionStop(ctx: RouteContext): Promise<void> {
  if (!requireAdmin(ctx)) {
    return;
  }
  const sessionId = ctx.params.sessionId ?? '';
  try {
    const session = await stopSession(sessionId);
    jsonResponse(ctx.res, 200, { ok: true, session });
  } catch (err) {
    errorResponse(ctx.res, 404, err instanceof Error ? err.message : String(err));
  }
}

export async function handleRuntimeSessionCheckpoint(ctx: RouteContext): Promise<void> {
  if (!requireAdmin(ctx)) {
    return;
  }
  const sessionId = ctx.params.sessionId ?? '';
  let body: unknown = {};
  try {
    body = await parseBody(ctx.req);
  } catch {
    body = {};
  }
  const record = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  const note = typeof record.note === 'string' ? record.note : undefined;
  try {
    const session = await checkpointSession(sessionId, note);
    jsonResponse(ctx.res, 200, { ok: true, session });
  } catch (err) {
    errorResponse(ctx.res, 400, err instanceof Error ? err.message : String(err));
  }
}
