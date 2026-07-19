/**
 * GET /api/public/integrations/whatsapp/wacrm/health
 * Health check for WACRM integration
 */

import type { NextRequest } from 'next/server';
import { jsonSuccess, jsonError } from '../../../../../../../lib/api-response';
import { HTTP_STATUS } from '../../../../../../../lib/constants';
import { whatsappConfig, WacrmWhatsAppProvider } from '../../../../../../../lib/whatsapp';

export async function GET(request: NextRequest): Promise<Response> {
  const wacrmConfig = whatsappConfig.getWacrmConfig();

  if (!wacrmConfig.enabled) {
    return jsonSuccess(
      { status: 'disabled', details: { reason: 'WACRM_ENABLED=false' } },
      HTTP_STATUS.OK
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

    return jsonSuccess({ status: health.status, details: health.details }, statusCode);
  } catch (err) {
    return jsonError(
      `WACRM health check failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      HTTP_STATUS.SERVICE_UNAVAILABLE
    );
  }
}
