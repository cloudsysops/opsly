/**
 * GET /api/admin/peskids/[slug]/integrations/whatsapp
 * Admin dashboard data for WhatsApp integration status
 */

import type { NextRequest } from 'next/server';
import { jsonError, jsonSuccess } from '@/lib/api-response';
import { HTTP_STATUS } from '@intcloudsysops/constants';
import { whatsappConfig } from '@intcloudsysops/whatsapp';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
): Promise<Response> {
  const { slug } = params;

  if (slug !== 'peskids') {
    return jsonError('Invalid tenant', HTTP_STATUS.FORBIDDEN);
  }

  try {
    const metaConfig = whatsappConfig.getMetaConfig();
    const wacrmConfig = whatsappConfig.getWacrmConfig();
    const peskidsConfig = whatsappConfig.getPeskidsWhatsAppConfig();

    return jsonSuccess(
      {
        tenant: slug,
        whatsapp_enabled: peskidsConfig.enabled,
        sandbox_mode: peskidsConfig.sandbox,
        approval_required: peskidsConfig.approvalRequired,
        provider: peskidsConfig.provider,
        meta: {
          enabled: metaConfig.enabled,
          app_id: metaConfig.appId ? `***${metaConfig.appId.slice(-4)}` : null,
          waba_id: metaConfig.wabaId ? `***${metaConfig.wabaId.slice(-8)}` : null,
          phone_number_id: metaConfig.phoneNumberId ? `***${metaConfig.phoneNumberId.slice(-8)}` : null,
        },
        wacrm: {
          enabled: wacrmConfig.enabled,
          base_url: wacrmConfig.baseUrl || null,
          configured: !!wacrmConfig.apiKey,
        },
        feature_flags: {
          whatsapp_enabled: peskidsConfig.enabled ? 'enabled' : 'disabled',
          meta_webhook_enabled: metaConfig.enabled ? 'enabled' : 'disabled',
          wacrm_enabled: wacrmConfig.enabled ? 'enabled' : 'disabled',
        },
        actions_available: [
          { action: 'test_connection', label: 'Test Connection' },
          { action: 'test_webhook', label: 'Test Webhook' },
          { action: 'view_logs', label: 'View Logs' },
          { action: 'view_templates', label: 'View Templates' },
        ],
        health_check_urls: [
          { provider: 'meta', url: '/api/public/integrations/whatsapp/meta/health' },
          { provider: 'wacrm', url: '/api/public/integrations/whatsapp/wacrm/health' },
        ],
      },
      HTTP_STATUS.OK
    );
  } catch (err) {
    return jsonError(
      `Failed to fetch integration status: ${err instanceof Error ? err.message : 'Unknown error'}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}
