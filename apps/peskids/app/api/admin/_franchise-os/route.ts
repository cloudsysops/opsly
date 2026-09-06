/**
 * /api/admin/franchise-os — retired in-app Franchise OS aggregate.
 *
 * The service module this route depended on (lib/services/franchise-os.service)
 * was deleted when Franchise OS moved to the standalone `apps/peskids-franchise`
 * app. Leaving the route importing a missing module broke the whole build; more
 * importantly, an unfinished module must not stay reachable just because the UI
 * stopped linking to it.
 *
 * So the route now: authenticates first (an anonymous caller still gets 401, not
 * a status leak), then refuses with a structured 503 while the module gate is
 * closed. The gate is closed by default everywhere and cannot be opened in
 * production without an explicit production-ready declaration.
 */
import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import { FRANCHISE_OS_GATE, moduleAvailability } from '@/lib/runtime/feature-flags';

export const dynamic = 'force-dynamic';

async function refuse(req: NextRequest) {
  const requestId = resolveRequestId(req);

  const auth = await validateStaffRequest(req);
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  const availability = moduleAvailability(FRANCHISE_OS_GATE);
  if (!availability.available) {
    return errorJson(
      requestId,
      'Franchise OS is not available in this deployment',
      503,
      'MODULE_DISABLED'
    );
  }

  // Gate open but there is no implementation left in this app.
  return errorJson(
    requestId,
    'Franchise OS moved to the standalone peskids-franchise app',
    410,
    'MODULE_MOVED'
  );
}

export async function GET(req: NextRequest) {
  return refuse(req);
}

export async function POST(req: NextRequest) {
  return refuse(req);
}
