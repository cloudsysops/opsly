import { HTTP_STATUS } from '../constants';
import { peskidsFetchDashboardSummary } from './repository';

/**
 * Dashboard MVP Peskids para owner autenticado en portal.
 */
export async function respondPeskidsPortalSummary(): Promise<Response> {
  const result = await peskidsFetchDashboardSummary();
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: HTTP_STATUS.INTERNAL_ERROR });
  }
  return Response.json({ ok: true, ...result.summary }, { status: HTTP_STATUS.OK });
}
