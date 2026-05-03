import type { NextRequest } from 'next/server';
import { runLocalServicesWebhookPost } from '../../../../../../lib/local-services-webhook-handler';
import { handleLocalServicesWebhookBookingCreated } from '../../../../../../lib/local-services-webhook-booking-created-handler';

/**
 * POST /api/local-services/webhooks/{slug}/booking-created
 * n8n / automation: acknowledge booking (tenant must match path; HMAC body).
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
      handleLocalServicesWebhookBookingCreated(slug, body),
  });
}
