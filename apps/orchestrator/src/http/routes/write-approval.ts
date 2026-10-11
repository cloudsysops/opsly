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

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(payload);
}

function error(res: ServerResponse, status: number, message: string, extra?: Record<string, unknown>): void {
  json(res, status, { success: false, error: message, ...extra });
}

/**
 * Canonical surface for AgentTaskWriteApprovalV1:
 * POST /api/local/agent-task-write-approval
 * body.action = "mint" | "consume"
 *
 * Server-side authoritative. Callers cannot self-assert approved=true.
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
    const bindingResult = agentTaskWriteApprovalBindingSchema.safeParse({
      work_id: b.work_id,
      request_id: b.request_id,
      workstream: b.workstream,
      conflict_key: b.conflict_key,
      repository: b.repository,
      pr_number: b.pr_number,
      pr_branch: b.pr_branch,
      pr_head_sha: b.pr_head_sha,
      write_allowed: true,
    });
    if (!bindingResult.success) {
      error(ctx.res, 400, 'invalid write approval binding', {
        issues: bindingResult.error.issues.map((i) => i.message),
      });
      return;
    }
    if (b.write_allowed === false) {
      error(ctx.res, 400, 'WRITE_APPROVAL_WRITE_ALLOWED_MISMATCH');
      return;
    }
    const approvedBy =
      typeof b.approved_by === 'string' && b.approved_by.trim().length > 0
        ? b.approved_by.trim()
        : 'platform-admin';
    const result = await store.mint({
      ...bindingResult.data,
      approved_by: approvedBy,
      expires_at: typeof b.expires_at === 'string' ? b.expires_at : undefined,
      approval_id: typeof b.approval_id === 'string' ? b.approval_id : undefined,
    });
    if (!result.ok) {
      error(ctx.res, result.error === 'WRITE_APPROVAL_EXPIRED' ? 400 : 409, result.error, {
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
    const bindingResult = agentTaskWriteApprovalBindingSchema.safeParse({
      work_id: b.work_id,
      request_id: b.request_id,
      workstream: b.workstream,
      conflict_key: b.conflict_key,
      repository: b.repository,
      pr_number: b.pr_number,
      pr_branch: b.pr_branch,
      pr_head_sha: b.pr_head_sha,
      write_allowed: true,
    });
    if (!bindingResult.success) {
      error(ctx.res, 400, 'invalid write approval binding', {
        issues: bindingResult.error.issues.map((i) => i.message),
      });
      return;
    }
    const binding: AgentTaskWriteApprovalBinding = bindingResult.data;
    const result = await store.consume({ approval_id: approvalId, binding });
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
      },
    });
    return;
  }

  error(ctx.res, 400, 'action must be mint or consume');
}
