/** LEGACY (GHL health probe): only meaningful when PESKIDS_GHL_ENABLED=true. */
import { isPeskidsGhlEnabled } from '@intcloudsysops/services/twenty';
import { GoHighLevelClient } from '../../../../../../lib/services/gohighlevel/client.js';
import { resolveGoHighLevelPeskidsEnv } from '../../../../../../lib/services/gohighlevel/env-config.js';
import { GhlHealthService } from '@/lib/monitoring/ghl-health.service';

export async function GET(): Promise<Response> {
  if (!isPeskidsGhlEnabled()) {
    return Response.json(
      {
        status: 'disabled',
        message: 'GHL legacy health check disabled (PESKIDS_GHL_ENABLED=false)',
        code: 'ghl_gone',
      },
      { status: 410 }
    );
  }

  const env = resolveGoHighLevelPeskidsEnv();

  if (!env.apiKey || !env.locationId) {
    return Response.json(
      {
        status: 'not_configured',
        message: 'GHL Peskids environment variables are not set',
      },
      { status: 503 }
    );
  }

  const client = new GoHighLevelClient(env.apiKey, env.baseUrl, {
    locationId: env.locationId,
    apiVersion: env.apiVersion,
  });

  const service = new GhlHealthService(client);
  const health = await service.checkHealth();

  const httpStatus = health.overall === 'healthy' ? 200 : health.overall === 'down' ? 503 : 200;

  return Response.json(health, { status: httpStatus });
}
