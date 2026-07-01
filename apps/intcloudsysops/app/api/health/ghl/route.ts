import { GoHighLevelClient } from '../../../../../../lib/services/gohighlevel/client.js';
import { resolveGoHighLevelPeskidsEnv } from '../../../../../../lib/services/gohighlevel/env-config.js';
import { GhlHealthService } from '@/lib/monitoring/ghl-health.service';

export async function GET(): Promise<Response> {
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
