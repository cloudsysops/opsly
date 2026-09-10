import type { RouteContext } from '../router.js';
import { parseBody, assertTenantSlugOrThrow, randomUUID } from '../utils.js';
import { enqueueJob } from '../../queue.js';
import type { OrchestratorJob } from '../../types.js';
import { jsonResponse, errorResponse } from '../router.js';
import {
  ingestDomainEvent,
  stripForbiddenPii,
  type BoardJobSpec,
  type DomainEvent,
} from '@intcloudsysops/ai-board';

function headerValue(req: RouteContext['req'], name: string): string {
  const raw = req.headers[name];
  if (Array.isArray(raw)) {
    return raw[0]?.trim() ?? '';
  }
  return typeof raw === 'string' ? raw.trim() : '';
}

function authorizeEventBus(ctx: RouteContext): boolean {
  const expected = process.env.OPSLY_EVENT_BUS_TOKEN?.trim() ?? '';
  if (expected.length === 0) {
    return true;
  }
  const token = headerValue(ctx.req, 'x-opsly-event-token');
  const auth = headerValue(ctx.req, 'authorization');
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  return token === expected || bearer === expected;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeDomainEvent(body: Record<string, unknown>): DomainEvent | null {
  const eventType = typeof body.event_type === 'string' ? body.event_type.trim() : '';
  const tenantSlugRaw =
    (typeof body.tenant_slug === 'string' && body.tenant_slug) ||
    (typeof body.tenant_id === 'string' && body.tenant_id) ||
    '';
  const tenantSlug = tenantSlugRaw.trim();
  const data = asRecord(body.data) ?? asRecord(body.payload) ?? {};
  if (!eventType || !tenantSlug) {
    return null;
  }
  const occurredAt =
    (typeof body.occurred_at === 'string' && body.occurred_at) ||
    (typeof body.created_at === 'string' && body.created_at) ||
    undefined;
  const requestId =
    (typeof body.request_id === 'string' && body.request_id) ||
    (typeof body.trace_id === 'string' && body.trace_id) ||
    undefined;
  return {
    event_type: eventType,
    tenant_slug: tenantSlug,
    occurred_at: occurredAt,
    request_id: requestId,
    data,
  };
}

function isDuplicateJobError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /already exists|Job.*exists/i.test(message);
}

function toNotifyJob(spec: BoardJobSpec, requestId: string): OrchestratorJob {
  return {
    type: 'notify',
    payload: {
      title: `Peskids ${spec.job_type}`,
      message: [
        `signal=${spec.signal_type}`,
        `entity=${spec.entity_kind}:${spec.entity_id}`,
        `level=${spec.automation_level}`,
        'human SEND required',
      ].join(' '),
      type: spec.priority === 'P1' ? 'warning' : 'info',
      board_job: spec,
    },
    tenant_slug: spec.tenant_slug,
    initiated_by: 'system',
    request_id: requestId,
    idempotency_key: spec.idempotency_key,
    agent_role: 'notifier',
    autonomy_risk: 'low',
    metadata: {
      source: 'ai-board',
      automation_level: spec.automation_level,
      owner_capability: spec.owner_capability,
      execute_external: false,
    },
  };
}

async function enqueueBoardJob(
  spec: BoardJobSpec,
  requestId: string
): Promise<'enqueued' | 'duplicate' | 'deferred'> {
  const job = toNotifyJob(spec, requestId);
  try {
    await enqueueJob(job);
    return 'enqueued';
  } catch (err) {
    if (isDuplicateJobError(err)) {
      return 'duplicate';
    }
    console.warn('[ai-board] enqueue deferred', {
      idempotency_key: spec.idempotency_key,
      error: err instanceof Error ? err.message : String(err),
    });
    return 'deferred';
  }
}

function withStrippedPii(record: Record<string, unknown>): Record<string, unknown> {
  const next = { ...record };
  if (next.data !== undefined) {
    next.data = stripForbiddenPii(next.data);
  }
  if (next.payload !== undefined) {
    next.payload = stripForbiddenPii(next.payload);
  }
  return next;
}

export async function handleBoardEvents(ctx: RouteContext): Promise<void> {
  if (!authorizeEventBus(ctx)) {
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
  const record = asRecord(body);
  if (!record) {
    errorResponse(ctx.res, 400, 'invalid body');
    return;
  }
  await respondToBoardEvent(ctx, withStrippedPii(record));
}

async function respondToBoardEvent(
  ctx: RouteContext,
  record: Record<string, unknown>
): Promise<void> {
  const event = normalizeDomainEvent(record);
  if (!event) {
    errorResponse(ctx.res, 400, 'event_type and tenant_slug required');
    return;
  }
  try {
    assertTenantSlugOrThrow(event.tenant_slug);
  } catch (err) {
    errorResponse(ctx.res, 400, err instanceof Error ? err.message : String(err));
    return;
  }
  const ingested = ingestDomainEvent(event);
  if (!ingested.ok) {
    const status = ingested.rejected_reason === 'pii' ? 400 : 422;
    jsonResponse(ctx.res, status, { ok: false, reason: ingested.rejected_reason });
    return;
  }
  const requestId = event.request_id?.trim() || randomUUID();
  const jobs = [];
  for (const spec of ingested.jobs) {
    jobs.push({
      idempotency_key: spec.idempotency_key,
      status: await enqueueBoardJob(spec, requestId),
    });
  }
  jsonResponse(ctx.res, 202, {
    ok: true,
    request_id: requestId,
    signals: ingested.signals.map((row) => row.type),
    jobs,
  });
}
