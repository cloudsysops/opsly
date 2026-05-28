import { handleStripeWebhookPost } from '../../../../lib/stripe/unified-webhook';

export async function POST(request: Request): Promise<Response> {
  return handleStripeWebhookPost(request);
}
