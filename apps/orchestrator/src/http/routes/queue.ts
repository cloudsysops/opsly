import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { parseBody, jsonResponse, errorResponse } from '../router.js';
import { verifyPlatformAdminToken, assertTenantSlugOrThrow } from '../utils.js';
import type { OrchestratorJob } from '../../types.js';
import { enqueueJob } from '../../queue.js';
import { resolveAutonomyPolicy } from '../../autonomy/policy.js';
import { hasExplicitAutonomyApproval } from '../utils.js';

export async function handleEnqueueOllama(
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
  const tenantSlug = typeof b.tenant_slug === 'string' ? b.tenant_slug.trim() : '';
  const prompt = typeof b.prompt === 'string' ? b.prompt.trim() : '';
  if (!tenantSlug || !prompt) {
    return errorResponse(res, 'tenant_slug and prompt required', 400);
  }
  try {
    assertTenantSlugOrThrow(tenantSlug);
  } catch (err) {
    return errorResponse(res, err instanceof Error ? err.message : String(err), 400);
  }
  const taskRaw = b.task_type;
  const taskType =
    taskRaw === 'analyze' || taskRaw === 'generate' || taskRaw === 'review' || taskRaw === 'summarize'
      ? taskRaw
      : 'summarize';
  let plan: OrchestratorJob['plan'];
  const p = b.plan;
  if (p === 'startup' || p === 'business' || p === 'enterprise') {
    plan = p;
  }
  const tenantId =
    typeof b.tenant_id === 'string' && b.tenant_id.length > 0 ? b.tenant_id : undefined;
  const requestId =
    (typeof b.request_id === 'string' && b.request_id.length > 0) ? b.request_id : randomUUID();
  const idempotencyKey =
    typeof b.idempotency_key === 'string' && b.idempotency_key.length > 0
      ? b.idempotency_key
      : undefined;
  const agentRoleRaw = b.agent_role;
  const agentRole =
    agentRoleRaw === 'planner' ||
    agentRoleRaw === 'executor' ||
    agentRoleRaw === 'tool' ||
    agentRoleRaw === 'notifier'
      ? agentRoleRaw
      : undefined;
  const metadata =
    typeof b.metadata === 'object' && b.metadata !== null
      ? (b.metadata as Record<string, unknown>)
      : undefined;

  const job: OrchestratorJob = {
    type: 'ollama',
    payload: { task_type: taskType, prompt },
    tenant_slug: tenantSlug,
    tenant_id: tenantId,
    plan,
    initiated_by: 'system',
    request_id: requestId,
    idempotency_key: idempotencyKey,
    agent_role: agentRole,
    metadata,
  };

  const policy = resolveAutonomyPolicy(job.type, job.autonomy_risk);
  if (policy.requiresApproval && !hasExplicitAutonomyApproval(req)) {
    return jsonResponse(res, { error: 'autonomy_approval_required', autonomy_risk: policy.riskLevel }, 403);
  }

  try {
    const bull = await enqueueJob(job);
    return jsonResponse(res, { ok: true, job_id: bull.id != null ? String(bull.id) : null, request_id: requestId }, 202);
  } catch (err) {
    return errorResponse(res, String(err), 500);
  }
}

export async function handleEnqueueWebhook(
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
  const tenantSlug = typeof b.tenant_slug === 'string' ? b.tenant_slug.trim() : '';
  if (!tenantSlug) {
    return errorResponse(res, 'tenant_slug required', 400);
  }
  try {
    assertTenantSlugOrThrow(tenantSlug);
  } catch (err) {
    return errorResponse(res, err instanceof Error ? err.message : String(err), 400);
  }
  const event = typeof b.event === 'string' ? b.event : 'unknown';
  const requestId =
    (typeof b.request_id === 'string' && b.request_id.length > 0) ? b.request_id : randomUUID();

  const job: OrchestratorJob = {
    type: 'n8n',
    payload: {
      webhook_url: typeof b.webhook_url === 'string' ? b.webhook_url : '',
      event,
      request_id: requestId,
      payload: b.payload as Record<string, unknown>,
    },
    tenant_slug: tenantSlug,
    initiated_by: 'system',
    request_id: requestId,
  };

  try {
    const bull = await enqueueJob(job);
    return jsonResponse(res, { ok: true, job_id: bull.id != null ? String(bull.id) : null, request_id: requestId }, 202);
  } catch (err) {
    return errorResponse(res, String(err), 500);
  }
}

export async function handleEnqueueSandbox(
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
  const tenantSlug = typeof b.tenant_slug === 'string' ? b.tenant_slug.trim() : '';
  const prompt = typeof b.prompt === 'string' ? b.prompt.trim() : '';
  if (!tenantSlug || !prompt) {
    return errorResponse(res, 'tenant_slug and prompt required', 400);
  }
  try {
    assertTenantSlugOrThrow(tenantSlug);
  } catch (err) {
    return errorResponse(res, err instanceof Error ? err.message : String(err), 400);
  }
  const requestId =
    (typeof b.request_id === 'string' && b.request_id.length > 0) ? b.request_id : randomUUID();

  const job: OrchestratorJob = {
    type: 'sandbox_execution',
    payload: {
      command: typeof b.command === 'string' ? b.command : prompt,
      image: typeof b.image === 'string' ? b.image : undefined,
      timeout: typeof b.timeout === 'number' ? b.timeout : 300,
      tenant_slug: tenantSlug,
      request_id: requestId,
    },
    tenant_slug: tenantSlug,
    initiated_by: 'system',
    request_id: requestId,
  };

  try {
    const bull = await enqueueJob(job);
    return jsonResponse(res, { ok: true, job_id: bull.id != null ? String(bull.id) : null, request_id: requestId }, 202);
  } catch (err) {
    return errorResponse(res, String(err), 500);
  }
}

export async function handleEnqueueJcode(
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
  const tenantSlug = typeof b.tenant_slug === 'string' ? b.tenant_slug.trim() : '';
  const prompt = typeof b.prompt === 'string' ? b.prompt.trim() : '';
  if (!tenantSlug || !prompt) {
    return errorResponse(res, 'tenant_slug and prompt required', 400);
  }
  try {
    assertTenantSlugOrThrow(tenantSlug);
  } catch (err) {
    return errorResponse(res, err instanceof Error ? err.message : String(err), 400);
  }
  const requestId =
    (typeof b.request_id === 'string' && b.request_id.length > 0) ? b.request_id : randomUUID();

  const job: OrchestratorJob = {
    type: 'jcode_execution',
    payload: { prompt },
    tenant_slug: tenantSlug,
    initiated_by: 'system',
    request_id: requestId,
  };

  try {
    const bull = await enqueueJob(job);
    return jsonResponse(res, { ok: true, job_id: bull.id != null ? String(bull.id) : null, request_id: requestId }, 202);
  } catch (err) {
    return errorResponse(res, String(err), 500);
  }
}