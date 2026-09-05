import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import { listPeskidsFranchises, getPrimaryFranchise } from '@/lib/services/franchise.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/franchises
 * Lists franchises under tenant peskids (not separate tenants).
 */
export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  try {
    const statusParam = req.nextUrl.searchParams.get('status');
    const status =
      statusParam === 'active' || statusParam === 'paused' || statusParam === 'archived'
        ? statusParam
        : undefined;
    const [franchises, primary] = await Promise.all([
      listPeskidsFranchises(status ? { status } : undefined),
      getPrimaryFranchise(),
    ]);
    return successJson(requestId, {
      ok: true,
      tenant_slug: 'peskids',
      primary_franchise_id: primary?.id ?? null,
      franchises,
    });
  } catch (err) {
    console.error('[GET /api/admin/franchises]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to list franchises', 500);
  }
}
