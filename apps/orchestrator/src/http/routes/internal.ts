import type { RouteContext } from '../router.js';
import {
  verifyPlatformAdminToken,
  parseBody,
  assertTenantSlugOrThrow,
  enrichAutonomyMetadata,
  randomUUID,
} from '../utils.js';
import { enqueueJob } from '../../queue.js';
import type { OrchestratorJob } from '../../types.js';
import { recordOpenClawIntentQueued } from '../../openclaw/runtime-events.js';
import { jsonResponse, errorResponse } from '../router.js';

export async function handleEnqueueAgentFarm(ctx: RouteContext): Promise<void> {
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
  const role = b.role;
  const task = typeof b.task === 'string' ? b.task.trim() : '';
  const tenantSlug = typeof b.tenant_slug === 'string' ? b.tenant_slug.trim() : 'opsly-internal';
  const maxSteps = typeof b.max_steps === 'number' ? Math.floor(b.max_steps) : 30;

  if (!['dev-api', 'dev-ui', 'devops'].includes(String(role))) {
    errorResponse(ctx.res, 400, 'invalid role: must be dev-api, dev-ui, or devops');
    return;
  }
  if (task.length === 0) {
    errorResponse(ctx.res, 400, 'task required');
    return;
  }
  try {
    assertTenantSlugOrThrow(tenantSlug);
  } catch (err) {
    errorResponse(ctx.res, 400, err instanceof Error ? err.message : String(err));
    return;
  }

  const requestId =
    typeof b.request_id === 'string' && b.request_id.length > 0 ? b.request_id : randomUUID();

  const job: OrchestratorJob = {
    type: 'agent_farm',
    payload: { role, task, max_steps: maxSteps, tenant_slug: tenantSlug },
    tenant_slug: tenantSlug,
    initiated_by: 'claude',
    request_id: requestId,
    agent_role: 'executor',
    metadata: { source: 'mcp-start-agent-farm' },
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

export async function handleOpenClawImproveDocumentation(ctx: RouteContext): Promise<void> {
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
  const payload = body as Record<string, unknown>;
  const tenantSlug = typeof payload.tenant_slug === 'string' ? payload.tenant_slug.trim() : '';
  if (tenantSlug.length === 0) {
    errorResponse(ctx.res, 400, 'tenant_slug required');
    return;
  }
  try {
    assertTenantSlugOrThrow(tenantSlug);
  } catch (err) {
    errorResponse(ctx.res, 400, err instanceof Error ? err.message : String(err));
    return;
  }

  const objective =
    typeof payload.objective === 'string' && payload.objective.trim().length > 0
      ? payload.objective.trim()
      : `Improve operational documentation for tenant ${tenantSlug}`;
  const requestId =
    typeof payload.request_id === 'string' && payload.request_id.length > 0
      ? payload.request_id
      : randomUUID();
  const sourceDoc =
    typeof payload.source_doc === 'string' && payload.source_doc.trim().length > 0
      ? payload.source_doc.trim()
      : null;
  const targetDoc =
    typeof payload.target_doc === 'string' && payload.target_doc.trim().length > 0
      ? payload.target_doc.trim()
      : null;

  const intentRequest: Record<string, unknown> = {
    intent: 'oar_react',
    initiated_by: 'system',
    plan: 'business',
    request_id: requestId,
    taskId: `improve-docs-${requestId}`,
    tenant_slug: tenantSlug,
    agent_role: 'planner',
    context: {
      prompt: objective,
      task: 'improve_documentation',
      openclaw_pipeline: ['planner', 'skeptic', 'validator'],
      source_doc: sourceDoc,
      target_doc: targetDoc,
    },
    metadata: {
      openclaw_pipeline: ['planner', 'skeptic', 'validator'],
      mission_control: true,
      triggered_by: 'internal/openclaw/improve-documentation',
    },
  };

  const job: OrchestratorJob = {
    type: 'intent_dispatch',
    payload: { intent_request: intentRequest },
    tenant_slug: tenantSlug,
    initiated_by: 'system',
    request_id: requestId,
    plan: 'business',
    agent_role: 'planner',
    metadata: { labels: ['openclaw', 'mission-control', 'improve-documentation'] },
  };

  try {
    const policyCheck = enrichAutonomyMetadata(ctx.req, job);
    if (!policyCheck.ok) {
      jsonResponse(ctx.res, policyCheck.status, policyCheck.payload);
      return;
    }
    const bull = await enqueueJob(job);
    const jobId = bull.id != null ? String(bull.id) : null;
    await recordOpenClawIntentQueued({
      requestId,
      tenantSlug,
      intent: 'improve_documentation',
      jobId,
    });
    jsonResponse(ctx.res, 202, {
      success: true,
      request_id: requestId,
      job_id: jobId,
      intent: 'improve_documentation',
      pipeline: ['planner', 'skeptic', 'validator'],
    });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}

export async function handleMetaOptimizerMetrics(ctx: RouteContext): Promise<void> {
  const { metricsStore } = await import('../../meta/orchestrator-metrics-store.js');
  jsonResponse(ctx.res, 200, {
    success: true,
    summary: metricsStore.getSummary(),
    recent_metrics: metricsStore.getAllMetrics().slice(0, 20),
  });
}
