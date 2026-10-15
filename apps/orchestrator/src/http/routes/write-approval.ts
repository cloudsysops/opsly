import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  agentTaskWriteApprovalBindingSchema,
  type AgentTaskWriteApprovalBinding,
  type WriteApprovalRejectReason,
} from '@intcloudsysops/agent-task-core';
import { parseBody, verifyPlatformAdminToken, verifyWriteApproverToken } from '../utils.js';
import { getWriteApprovalStore } from '../../write-approval-store-singleton.js';
import type { WriteApprovalStorePort } from '../../write-approval-store.js';

type RouteCtx = { req: IncomingMessage; res: ServerResponse };

/** Trusted principal for OPSLY_WRITE_APPROVER_TOKEN — never caller-controlled. */
const TRUSTED_WRITE_APPROVER = 'write-approver';

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(payload);
}

function error(res: ServerResponse, status: number, message: string, extra?: Record<string, unknown>): void {
  json(res, status, { success: false, error: message, ...extra });
}

function isStoreUnavailable(
  code: string | undefined
): code is 'WRITE_APPROVAL_STORE_UNAVAILABLE' | 'WRITE_APPROVAL_STORE_MISSING' {
  return code === 'WRITE_APPROVAL_STORE_UNAVAILABLE' || code === 'WRITE_APPROVAL_STORE_MISSING';
}

function parseBinding(b: Record<string, unknown>):
  | { ok: true; binding: AgentTaskWriteApprovalBinding }
  | { ok: false; issues: string[] } {
  // write_allowed must be the literal boolean true — omit / string "false" / other types fail.
  if (b.write_allowed !== true && b.write_allowed !== undefined) {
    return { ok: false, issues: ['write_allowed must be literal boolean true'] };
  }
  if (b.write_allowed !== true) {
    return { ok: false, issues: ['write_allowed must be explicitly true'] };
  }
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
    task_content_sha256: b.task_content_sha256,
    selected_agent: b.selected_agent,
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
 * Mint requires OPSLY_WRITE_APPROVER_TOKEN (distinct from PLATFORM_ADMIN_TOKEN).
 * Consume may use write-approver or platform-admin for operational recovery.
 * Callers cannot self-assert approved=true.
 */
export async function handleAgentTaskWriteApproval(
  ctx: RouteCtx,
  storeOverride?: WriteApprovalStorePort
): Promise<void> {
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

  const b = body as Record<string, unknown>;
  const action = typeof b.action === 'string' ? b.action.trim().toLowerCase() : '';

  if (action === 'mint') {
    if (!verifyWriteApproverToken(ctx.req)) {
      error(ctx.res, 401, 'unauthorized', {
        hint: 'mint requires OPSLY_WRITE_APPROVER_TOKEN (distinct from PLATFORM_ADMIN_TOKEN)',
      });
      return;
    }
    const parsed = parseBinding(b);
    if (!parsed.ok) {
      error(ctx.res, 400, 'invalid write approval binding', { issues: parsed.issues });
      return;
    }
    try {
      const store = storeOverride ?? (await getWriteApprovalStore());
      const requestedBy =
        typeof b.approved_by === 'string' && b.approved_by.trim().length > 0
          ? b.approved_by.trim()
          : typeof b.requested_by === 'string' && b.requested_by.trim().length > 0
            ? b.requested_by.trim()
            : undefined;
      const result = await store.mint({
        ...parsed.binding,
        approved_by: TRUSTED_WRITE_APPROVER,
        expires_at: typeof b.expires_at === 'string' ? b.expires_at : undefined,
        approval_id: typeof b.approval_id === 'string' ? b.approval_id : undefined,
      });
      if (!result.ok) {
        if (isStoreUnavailable(result.error)) {
          error(ctx.res, 503, result.error, { retryable: true, message: result.message });
          return;
        }
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
          auth_principal: TRUSTED_WRITE_APPROVER,
          ...(requestedBy ? { requested_by: requestedBy } : {}),
        },
      });
      return;
    } catch (err) {
      error(ctx.res, 503, 'WRITE_APPROVAL_STORE_UNAVAILABLE', {
        retryable: true,
        message: err instanceof Error ? err.message : String(err),
      });
      return;
    }
  }

  if (action === 'consume') {
    // Operational consume: write-approver or platform-admin (not anonymous).
    if (!verifyWriteApproverToken(ctx.req) && !verifyPlatformAdminToken(ctx.req)) {
      error(ctx.res, 401, 'unauthorized');
      return;
    }
    const authPrincipal = verifyWriteApproverToken(ctx.req)
      ? TRUSTED_WRITE_APPROVER
      : 'platform-admin';
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
    try {
      const store = storeOverride ?? (await getWriteApprovalStore());
      const result = await store.consume({ approval_id: approvalId, binding: parsed.binding });
      if (!result.ok) {
        if (isStoreUnavailable(result.error)) {
          error(ctx.res, 503, result.error, { retryable: true });
          return;
        }
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
          auth_principal: authPrincipal,
        },
      });
      return;
    } catch (err) {
      error(ctx.res, 503, 'WRITE_APPROVAL_STORE_UNAVAILABLE' satisfies WriteApprovalRejectReason, {
        retryable: true,
        message: err instanceof Error ? err.message : String(err),
      });
      return;
    }
  }

  error(ctx.res, 400, 'action must be mint or consume');
}
