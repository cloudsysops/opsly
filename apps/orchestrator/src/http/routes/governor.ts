import type { RouteContext } from '../router.js';
import { verifyPlatformAdminToken } from '../utils.js';
import { jsonResponse, errorResponse } from '../router.js';
import { getGovernorStatusSnapshot } from '../../lib/runtime-governor.js';
import { sweepIdleSessions } from '../../lib/runtime-governor-sweeper.js';

/** GET /internal/runtime/governor/status */
export async function handleGovernorStatus(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }
  const url = new URL(ctx.req.url ?? '/', 'http://localhost');
  const plan = url.searchParams.get('tenant_plan')?.trim() || undefined;
  try {
    const status = await getGovernorStatusSnapshot(plan);
    jsonResponse(ctx.res, 200, { success: true, governor: status });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}

/** POST /internal/runtime/governor/sweep-idle */
export async function handleGovernorSweepIdle(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }
  try {
    const result = await sweepIdleSessions();
    jsonResponse(ctx.res, 200, { success: true, sweep: result });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}
