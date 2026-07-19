/**
 * GET /api/public/integrations/whatsapp/meta/health
 * Health check for Meta WhatsApp Cloud API integration
 */

import type { NextRequest } from 'next/server';
import { HTTP_STATUS } from '../../../../../../../lib/constants';
import { whatsappConfig, MetaCloudWhatsAppProvider } from '../../../../../../../lib/whatsapp';

export async function GET(request: NextRequest): Promise<Response> {
  const metaConfig = whatsappConfig.getMetaConfig();

  if (!metaConfig.enabled) {
    return Response.json(
      { status: 'disabled', details: { reason: 'META_WEBHOOK_ENABLED=false' } },
      { status: HTTP_STATUS.OK }
    );
  }

  try {
    const provider = new MetaCloudWhatsAppProvider('peskids', {
      appId: metaConfig.appId,
      appSecret: metaConfig.appSecret,
      accessToken: metaConfig.accessToken,
      wabaId: metaConfig.wabaId,
      phoneNumberId: metaConfig.phoneNumberId,
      apiVersion: metaConfig.apiVersion,
    });

    const health = await provider.healthCheck();
    const statusCode = health.status === 'healthy' ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;

    return Response.json({ status: health.status, details: health.details }, { status: statusCode });
  } catch (err) {
    return Response.json(
      { error: `Meta health check failed: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
    );
  }
}
