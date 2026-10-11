import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  agentTaskWriteApprovalBindingSchema,
  type AgentTaskWriteApprovalBinding,
} from '@intcloudsysops/agent-task-core';
import { parseBody, verifyPlatformAdminToken } from '../utils.js';
import {
  getWriteApprovalStore,
  type WriteApprovalStorePort,
} from '../../write-approval-store-singleton.js';

type RouteCtx = { req: IncomingMessage; res: ServerResponse };

/** Trusted principal for shared PLATFORM_ADMIN_TOKEN auth — never caller-controlled. */
const TRUSTED_APPROVER = 'platform-admin';

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(payload);
}

function error(res: ServerResponse, status: number, message: string, extra?: Record<string, unknown>): void {
  json(res, status, { success: false, error: message, ...extra });
}

function parseBinding(b: Record<string, unknown>):
  | { ok: true; binding: AgentTaskWriteApprovalBinding }
  | { ok: false; issues: string[] } {
  const bindingResult = agentTaskWriteApprovalBindingSchema.safeParse({
    work_id: b.work_id,
    request_id: b.request_id,
    claim_id: b.claim_id,
    workstream: b.workstream,
    conflict_key: b.conflict_key,
    repository: b.repository,
    pr_number: b.pr_number,
    pr_branch: b.pr_branch,
    pr_head_sha: b.pr_head_sha,
    write_allowed: true,
  });
  if (!bindingResult.success) {
    return {
      ok: false,
      issues: bindingResult.error.issues.map((i) => i.message),
    };
  }
  return { ok: true, binding: bindingResult.data };
}

/**
 * Canonical surface for AgentTaskWriteApprovalV1:
 * POST /api/local/agent-task-write-approval
 * body.action = "mint" | "consume"
 *
 * Server-side authoritative. Callers cannot self-assert approved=true.
 * `approved_by` is always the authenticated token principal (platform-admin).
 */
export async function handleAgentTaskWriteApproval(
  ctx: RouteCtx,
  storeOverride?: WriteApprovalStorePort
): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    error(ctx.res, 401, 'unauthorized');
    return;
  }

  let body: unknown;
  try {
    body = await parseBody(ctx.req);
  } catch (err) {
    error(ctx.res, 400, err instanceof Error ? err.message : 'invalid body');
    return;
  }

  if (typeof body !== 'object' || body === null) {
    error(ctx.res, 400, 'body must be an object');
    return;
  }

  const store = storeOverride ?? (await getWriteApprovalStore());
  const b = body as Record<string, unknown>;
  const action = typeof b.action === 'string' ? b.action.trim().toLowerCase() : '';

  if (action === 'mint') {
    const parsed = parseBinding(b);
    if (!parsed.ok) {
      error(ctx.res, 400, 'invalid write approval binding', { issues: parsed.issues });
      return;
    }
    if (b.write_allowed === false) {
      error(ctx.res, 400, 'WRITE_APPROVAL_WRITE_ALLOWED_MISMATCH');
      return;
    }
    const requestedBy =
      typeof b.approved_by === 'string' && b.approved_by.trim().length > 0
        ? b.approved_by.trim()
        : typeof b.requested_by === 'string' && b.requested_by.trim().length > 0
          ? b.requested_by.trim()
          : undefined;
    const result = await store.mint({
      ...parsed.binding,
      approved_by: TRUSTED_APPROVER,
      expires_at: typeof b.expires_at === 'string' ? b.expires_at : undefined,
      approval_id: typeof b.approval_id === 'string' ? b.approval_id : undefined,
    });
    if (!result.ok) {
      const status =
        result.error === 'WRITE_APPROVAL_EXPIRED' || result.error === 'WRITE_APPROVAL_TTL_EXCEEDED'
          ? 400
          : 409;
      error(ctx.res, status, result.error, {
        message: result.message,
      });
      return;
    }
    json(ctx.res, 200, {
      success: true,
      action: 'mint',
      approval: result.approval,
      audit: {
        approval_id: result.approval.approval_id,
        approved_by: result.approval.approved_by,
        approved_at: result.approval.approved_at,
        auth_principal: TRUSTED_APPROVER,
        ...(requestedBy ? { requested_by: requestedBy } : {}),
      },
    });
    return;
  }

  if (action === 'consume') {
    const approvalId =
      typeof b.approval_id === 'string' ? b.approval_id.trim() : '';
    if (!approvalId) {
      error(ctx.res, 400, 'approval_id is required');
      return;
    }
    const parsed = parseBinding(b);
    if (!parsed.ok) {
      error(ctx.res, 400, 'invalid write approval binding', { issues: parsed.issues });
      return;
    }
    const result = await store.consume({ approval_id: approvalId, binding: parsed.binding });
    if (!result.ok) {
      const status =
        result.error === 'WRITE_APPROVAL_NOT_FOUND'
          ? 404
          : result.error === 'WRITE_APPROVAL_ALREADY_CONSUMED'
            ? 409
            : 403;
      error(ctx.res, status, result.error);
      return;
    }
    json(ctx.res, 200, {
      success: true,
      action: 'consume',
      approval: result.approval,
      audit: {
        approval_id: result.approval.approval_id,
        approved_by: result.approval.approved_by,
        approved_at: result.approval.approved_at,
        consumed_at: result.approval.consumed_at,
        auth_principal: TRUSTED_APPROVER,
      },
    });
    return;
  }

  error(ctx.res, 400, 'action must be mint or consume');
}
