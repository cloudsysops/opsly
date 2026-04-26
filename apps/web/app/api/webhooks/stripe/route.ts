import { handleStripeWebhook } from '../../../../lib/stripe/webhook-handler';

export async function POST(request: Request): Promise<Response> {
  return handleStripeWebhook(request);
}
