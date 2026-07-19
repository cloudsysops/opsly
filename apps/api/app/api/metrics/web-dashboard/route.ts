import { serverErrorLogged, tryRoute } from '@/lib/api-response';
import { requireAdminAccessUnlessDemoRead } from '../../../../lib/auth';
import { getWebDashboardMetricsJson } from '../../../../lib/metrics-web-dashboard';

export function GET(request: Request): Promise<Response> {
  return tryRoute('GET /api/metrics/web-dashboard', async () => {
    const authError = await requireAdminAccessUnlessDemoRead(request);
    if (authError) {
      return authError;
    }
    try {
      const body = await getWebDashboardMetricsJson();
      return Response.json(body);
    } catch (err) {
      return serverErrorLogged('web-dashboard metrics:', err);
    }
  });
}
