/**
 * GET /api/health/integrations
 * Comprehensive health check for all integrations
 */

import type { NextRequest } from 'next/server';
import { jsonSuccess } from '@/lib/api-response';
import { HTTP_STATUS } from '@intcloudsysops/constants';
import { getWhatsAppHealth } from '@intcloudsysops/observability/whatsapp-metrics';
import { whatsappConfig } from '@intcloudsysops/whatsapp';
import { checkAWSHealth } from '@intcloudsysops/cloud-providers/aws-config';
import { checkGCPHealth } from '@intcloudsysops/cloud-providers/gcp-config';

export async function GET(request: NextRequest): Promise<Response> {
  const whatsappHealth = getWhatsAppHealth();
  const awsHealth = await checkAWSHealth();
  const gcpHealth = await checkGCPHealth();

  const metaConfig = whatsappConfig.getMetaConfig();
  const wacrmConfig = whatsappConfig.getWacrmConfig();
  const peskidsConfig = whatsappConfig.getPeskidsWhatsAppConfig();

  const overallStatus =
    whatsappHealth.status === 'unhealthy' || awsHealth.status === 'unhealthy' || gcpHealth.status === 'unhealthy'
      ? 'unhealthy'
      : whatsappHealth.status === 'degraded' || awsHealth.status === 'unhealthy'
        ? 'degraded'
        : 'healthy';

  return jsonSuccess(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      integrations: {
        whatsapp: {
          enabled: peskidsConfig.enabled,
          status: whatsappHealth.status,
          provider: peskidsConfig.provider,
          checks: whatsappHealth.checks,
          warnings: whatsappHealth.warnings,
          metrics: {
            webhooks_received: whatsappHealth.metrics.webhooksReceived,
            webhooks_failed: whatsappHealth.metrics.webhooksFailed,
            messages_sent: whatsappHealth.metrics.messagesSent,
            messages_failed: whatsappHealth.metrics.messagesFailed,
            pending_approvals: whatsappHealth.metrics.approvalsPending,
            twenty_sync_pending: whatsappHealth.metrics.twentySyncPending,
          },
        },
        meta: {
          enabled: metaConfig.enabled,
          configured: !!metaConfig.appId,
        },
        wacrm: {
          enabled: wacrmConfig.enabled,
          configured: !!wacrmConfig.apiKey,
        },
        aws: {
          status: awsHealth.status,
          s3: awsHealth.s3,
          ses: awsHealth.ses,
          cloudwatch: awsHealth.cloudwatch,
        },
        gcp: {
          status: gcpHealth.status,
          oauth: gcpHealth.oauth,
          maps: gcpHealth.maps,
          places: gcpHealth.places,
        },
      },
    },
    overallStatus === 'unhealthy' ? HTTP_STATUS.SERVICE_UNAVAILABLE : HTTP_STATUS.OK
  );
}
