import type { NextRequest } from 'next/server';
import { runLocalServicesWebhookPost } from '../../../../../../../lib/local-services-webhook-handler';
import { handleLocalServicesWebhookReportCreate } from '../../../../../../../lib/local-services-webhook-report-handler';

/**
 * POST /api/local-services/webhooks/{slug}/reports/create
 * Creates a row in `platform.ls_reports` for the tenant (n8n field report).
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await context.params;

  return runLocalServicesWebhookPost({
    request,
    slug,
    handleValidatedJson: async (body: unknown) =>
      handleLocalServicesWebhookReportCreate(slug, body),
  });
}
