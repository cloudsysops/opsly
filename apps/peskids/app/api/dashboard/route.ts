import { NextRequest, NextResponse } from 'next/server';
import { validateStaffRequest } from '@/lib/staff-auth';
import { fetchDashboardData } from '@/lib/services/dashboard.service';
import { resolveFranchiseFilter, resolveStaffFranchiseScope } from '@/lib/franchise-scope';

export const dynamic = 'force-dynamic';

const NO_STORE = {
  'Cache-Control': 'no-store, private, max-age=0, must-revalidate',
} as const;

/**
 * GET /api/dashboard
 *
 * authenticate -> derive tenant -> derive franchise scope from the session ->
 * authorize the requested franchise -> query.
 *
 * `?franchise_id=` used to be passed straight into the query, so any staff
 * session could read another sede's leads, students and revenue simply by
 * changing the query string. It is now only ever a *request*: the scope comes
 * from the session and an out-of-scope id is a 403.
 */
export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();

  try {
    const auth = await validateStaffRequest(req);
    if (!auth.ok) {
      return NextResponse.json(
        { ok: false, error: auth.error, code: auth.status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED', request_id: requestId },
        { status: auth.status, headers: NO_STORE }
      );
    }

    const rangeParam = req.nextUrl.searchParams.get('range');
    const range = rangeParam === 'month' ? 'month' : 'week';
    const requestedFranchiseId = req.nextUrl.searchParams.get('franchise_id')?.trim() || null;
    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids';

    const scope = await resolveStaffFranchiseScope(auth);
    const filter = resolveFranchiseFilter(scope, requestedFranchiseId);

    if (!filter.ok) {
      console.warn(
        JSON.stringify({
          component: 'peskids.dashboard',
          event: 'franchise_scope_denied',
          request_id: requestId,
          tenant_slug: tenantId,
          actor_id: auth.user?.id ?? 'dashboard-admin',
          requested_franchise_id: requestedFranchiseId,
          reason: filter.reason,
        })
      );
      return NextResponse.json(
        {
          ok: false,
          error:
            filter.status === 403
              ? 'Forbidden'
              : 'franchise_id is required for multi-franchise staff',
          code: filter.status === 403 ? 'FORBIDDEN' : 'BAD_REQUEST',
          request_id: requestId,
        },
        { status: filter.status, headers: NO_STORE }
      );
    }

    const data = await fetchDashboardData(tenantId, range, filter.franchiseId);
    return NextResponse.json(data, { headers: NO_STORE });
  } catch (error) {
    console.error('[dashboard] error:', error, { request_id: requestId });
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to fetch dashboard data',
        code: 'INTERNAL_ERROR',
        request_id: requestId,
      },
      { status: 500, headers: NO_STORE }
    );
  }
}
