import { proxyToPlatformApi } from '../../../lib/proxy-platform-api';

/**
 * Métricas anidadas (tenants/plans/mrr/conversion). Canónico: GET /api/metrics/web-dashboard en apps/api.
 */
export function GET(request: Request): Promise<Response> {
  return proxyToPlatformApi({ request, apiPath: '/api/metrics/web-dashboard' });
}
