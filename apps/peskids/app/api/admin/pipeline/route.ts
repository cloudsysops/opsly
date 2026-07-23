import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffSession } from '@/lib/staff-auth';
import { isOperationalStaffUser } from '@/lib/staff-user';
import {
  fetchPipelineBoard,
  parsePipelineFilters,
} from '@/lib/services/lead-pipeline.service';

export const dynamic = 'force-dynamic';

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffSession();

  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  if (auth.user && !isOperationalStaffUser(auth.user)) {
    return errorJson(requestId, 'Forbidden', 403);
  }

  try {
    const filters = parsePipelineFilters(req.nextUrl.searchParams);
    const board = await fetchPipelineBoard(tenantSlug(), filters);

    return successJson(requestId, {
      ok: true,
      ...board,
      filters,
    });
  } catch (err) {
    console.error('[GET /api/admin/pipeline]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to load pipeline', 500);
  }
}
