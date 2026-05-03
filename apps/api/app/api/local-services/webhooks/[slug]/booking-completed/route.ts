import type { NextRequest } from 'next/server';
import { runLocalServicesWebhookPost } from '../../../../../../lib/local-services-webhook-handler';
import { handleLocalServicesWebhookBookingCompleted } from '../../../../../../lib/local-services-webhook-booking-completed-handler';

/**
 * POST /api/local-services/webhooks/{slug}/booking-completed
 * Sets booking status to `completed` when signature and tenant match.
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
      handleLocalServicesWebhookBookingCompleted(slug, body),
  });
}
