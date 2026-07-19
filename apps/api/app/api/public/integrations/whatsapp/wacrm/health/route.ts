/**
 * GET /api/public/integrations/whatsapp/wacrm/health
 * Health check for WACRM integration
 */

import type { NextRequest } from 'next/server';
import { HTTP_STATUS } from '@intcloudsysops/constants';
import { whatsappConfig, WacrmWhatsAppProvider } from '@intcloudsysops/whatsapp';

export async function GET(request: NextRequest): Promise<Response> {
  const wacrmConfig = whatsappConfig.getWacrmConfig();

  if (!wacrmConfig.enabled) {
    return Response.json(
      { status: 'disabled', details: { reason: 'WACRM_ENABLED=false' } },
      { status: HTTP_STATUS.OK }
    );
  }

  try {
    const provider = new WacrmWhatsAppProvider('peskids', {
      baseUrl: wacrmConfig.baseUrl,
      apiKey: wacrmConfig.apiKey,
      webhookSecret: wacrmConfig.webhookSecret,
    });

    const health = await provider.healthCheck();
    const statusCode = health.status === 'healthy' ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;

    return Response.json({ status: health.status, details: health.details }, { status: statusCode });
  } catch (err) {
    return Response.json(
      { error: `WACRM health check failed: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
    );
  }
}
