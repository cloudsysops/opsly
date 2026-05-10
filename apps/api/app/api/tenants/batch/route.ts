import { NextResponse } from 'next/server';
import { jsonError, parseJsonBody } from '../../../../lib/api-response.js';
import { requireAdminAccess } from '../../../../lib/auth.js';
import { provisionTenant, suspendTenant, resumeTenant } from '../../../../lib/orchestrator.js';
import { buildBatchId, validateBatchSize } from '../../../../lib/batch.js';
import { HTTP_STATUS } from '../../../../lib/constants.js';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const _actionSchema = z.object({
  action: z.enum(['create', 'suspend', 'resume']),
  slug: z.string().regex(/^[a-z0-9-]{3,30}$/),
  owner_email: z.string().email().optional(),
  plan: z.enum(['startup', 'business', 'enterprise', 'demo']).optional(),
});

type TenantOp = z.infer<typeof _actionSchema>;

async function executeOp(op: TenantOp): Promise<unknown> {
  if (op.action === 'create') {
    if (!op.owner_email || !op.plan) throw new Error('create requires owner_email and plan');
    const result = await provisionTenant({
      slug: op.slug,
      owner_email: op.owner_email,
      plan: op.plan,
    });
    return { action: op.action, slug: op.slug, result };
  }
  if (op.action === 'suspend') {
    await suspendTenant(op.slug);
    return { action: op.action, slug: op.slug };
  }
  await resumeTenant(op.slug);
  return { action: op.action, slug: op.slug };
}

export async function POST(request: Request): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) return authError;

  const parsed = await parseJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const body = parsed.body as { operations?: TenantOp[]; batch_id?: string };
  if (!body.operations || !Array.isArray(body.operations) || body.operations.length === 0) {
    return jsonError('operations must be a non-empty array', HTTP_STATUS.BAD_REQUEST);
  }

  const sizeCheck = validateBatchSize(body.operations.length);
  if (!sizeCheck.valid) {
    return jsonError(sizeCheck.message ?? 'invalid batch size', HTTP_STATUS.BAD_REQUEST);
  }

  const batchId = body.batch_id || buildBatchId('tenant-batch');
  const settled = await Promise.allSettled(body.operations.map((op) => executeOp(op)));

  const ok = settled
    .filter((r) => r.status === 'fulfilled')
    .map((r) => (r as PromiseFulfilledResult<unknown>).value);
  const fail = settled
    .filter((r) => r.status === 'rejected')
    .map((r: PromiseRejectedResult) => ({
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
    }));

  return NextResponse.json({
    batch_id: batchId,
    total: body.operations.length,
    succeeded: ok.length,
    failed: fail.length,
    results: ok,
    errors: fail,
  });
}
