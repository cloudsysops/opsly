import type { RouteContext } from '../router.js';
import {
  randomUUID,
  parseBody,
  verifyPlatformAdminToken,
  assertTenantSlugOrThrow,
  enrichAutonomyMetadata,
} from '../utils.js';
import { enqueueJob } from '../../queue.js';
import { enqueueWebhookJob } from '../../workers/WebhookWorker.js';
import type { OrchestratorJob } from '../../types.js';
import { parseWebhookJobData } from '../../webhook-target.js';
import { jsonResponse, errorResponse } from '../router.js';

export async function handleEnqueueOllama(ctx: RouteContext): Promise<void> {
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
  const tenantSlug = typeof b.tenant_slug === 'string' ? b.tenant_slug.trim() : '';
  const prompt = typeof b.prompt === 'string' ? b.prompt.trim() : '';
  if (tenantSlug.length === 0 || prompt.length === 0) {
    errorResponse(ctx.res, 400, 'tenant_slug and prompt required');
    return;
  }
  try {
    assertTenantSlugOrThrow(tenantSlug);
  } catch (err) {
    errorResponse(ctx.res, 400, err instanceof Error ? err.message : String(err));
    return;
  }
  const taskRaw = b.task_type;
  const taskType =
    taskRaw === 'analyze' ||
    taskRaw === 'generate' ||
    taskRaw === 'review' ||
    taskRaw === 'summarize'
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
    typeof b.request_id === 'string' && b.request_id.length > 0 ? b.request_id : randomUUID();
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

  try {
    const policyCheck = enrichAutonomyMetadata(ctx.req, job);
    if (!policyCheck.ok) {
      jsonResponse(ctx.res, policyCheck.status, policyCheck.payload);
      return;
    }
    const bull = await enqueueJob(job);
    jsonResponse(ctx.res, 202, {
      ok: true,
      job_id: bull.id != null ? String(bull.id) : null,
      request_id: requestId,
    });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}

export async function handleEnqueueWebhook(ctx: RouteContext): Promise<void> {
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

  const parsed = parseWebhookJobData(body);
  if (!parsed.ok) {
    errorResponse(ctx.res, 400, parsed.error);
    return;
  }

  try {
    await enqueueWebhookJob(parsed.data);
    jsonResponse(ctx.res, 202, { ok: true });
  } catch (err) {
    errorResponse(ctx.res, 400, String(err));
  }
}

export async function handleEnqueueSandbox(ctx: RouteContext): Promise<void> {
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
  const command = typeof b.command === 'string' ? b.command.trim() : '';
  const tenantSlug = typeof b.tenant_slug === 'string' ? b.tenant_slug.trim() : '';
  const requestId =
    typeof b.request_id === 'string' && b.request_id.length > 0 ? b.request_id : randomUUID();
  if (command.length === 0 || tenantSlug.length === 0) {
    errorResponse(ctx.res, 400, 'command and tenant_slug required');
    return;
  }
  try {
    assertTenantSlugOrThrow(tenantSlug);
  } catch (err) {
    errorResponse(ctx.res, 400, err instanceof Error ? err.message : String(err));
    return;
  }

  const image = typeof b.image === 'string' && b.image.length > 0 ? b.image : 'alpine:latest';
  const timeoutRaw = b.timeout;
  const timeout =
    typeof timeoutRaw === 'number' && Number.isFinite(timeoutRaw) ? Math.floor(timeoutRaw) : 300;
  const allowNetwork = b.allowNetwork === true;

  const job: OrchestratorJob = {
    type: 'sandbox_execution',
    payload: {
      type: 'sandbox_execution',
      command,
      image,
      timeout,
      allowNetwork,
      tenant_slug: tenantSlug,
      request_id: requestId,
    },
    tenant_slug: tenantSlug,
    initiated_by: 'system',
    request_id: requestId,
    metadata: { labels: ['sandbox'] },
  };

  try {
    const policyCheck = enrichAutonomyMetadata(ctx.req, job);
    if (!policyCheck.ok) {
      jsonResponse(ctx.res, policyCheck.status, policyCheck.payload);
      return;
    }
    const bull = await enqueueJob(job);
    jsonResponse(ctx.res, 202, {
      success: true,
      job_id: bull.id != null ? String(bull.id) : null,
      request_id: requestId,
    });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}

export async function handleEnqueueJcode(ctx: RouteContext): Promise<void> {
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
  const prompt = typeof b.prompt === 'string' ? b.prompt.trim() : '';
  const tenantSlug = typeof b.tenant_slug === 'string' ? b.tenant_slug.trim() : '';
  const requestId =
    typeof b.request_id === 'string' && b.request_id.length > 0 ? b.request_id : randomUUID();
  if (prompt.length === 0 || tenantSlug.length === 0) {
    errorResponse(ctx.res, 400, 'prompt and tenant_slug required');
    return;
  }
  try {
    assertTenantSlugOrThrow(tenantSlug);
  } catch (err) {
    errorResponse(ctx.res, 400, err instanceof Error ? err.message : String(err));
    return;
  }

  const timeoutRaw = b.timeout;
  const timeout =
    typeof timeoutRaw === 'number' && Number.isFinite(timeoutRaw) ? Math.floor(timeoutRaw) : 900;
  const allowNetwork = b.allowNetwork === true;
  const model = typeof b.model === 'string' && b.model.length > 0 ? b.model : undefined;
  const provider = typeof b.provider === 'string' && b.provider.length > 0 ? b.provider : undefined;
  const sandboxImage =
    typeof b.sandboxImage === 'string' && b.sandboxImage.length > 0 ? b.sandboxImage : undefined;

  const job: OrchestratorJob = {
    type: 'jcode_execution',
    payload: { prompt, model, provider, timeout, allowNetwork, sandboxImage },
    tenant_slug: tenantSlug,
    initiated_by: 'system',
    request_id: requestId,
    metadata: { labels: ['jcode', 'sandbox'] },
  };

  try {
    const policyCheck = enrichAutonomyMetadata(ctx.req, job);
    if (!policyCheck.ok) {
      jsonResponse(ctx.res, policyCheck.status, policyCheck.payload);
      return;
    }
    const bull = await enqueueJob(job);
    jsonResponse(ctx.res, 202, {
      success: true,
      job_id: bull.id != null ? String(bull.id) : null,
      request_id: requestId,
    });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}
