import { createHmac } from 'crypto';
import type { WebhookConfig, WebhookTriggerPayload, WebhookTriggerResult } from './peskids-types';
import { assertSafeOutboundHttpsUrl } from './safe-outbound-url';

export async function triggerWebhooks(
  webhooks: WebhookConfig[],
  payload: WebhookTriggerPayload
): Promise<WebhookTriggerResult> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const webhook of webhooks) {
    if (!webhook.is_active) {
      continue;
    }

    const safeUrl = assertSafeOutboundHttpsUrl(webhook.webhook_url);
    if (!safeUrl.ok) {
      results.failed += 1;
      results.errors.push(`Webhook ${webhook.id}: ${safeUrl.error}`);
      continue;
    }

    try {
      const payloadJson = JSON.stringify(payload);
      const signature = createHmac('sha256', webhook.secret).update(payloadJson).digest('hex');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(safeUrl.href, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Opsly-Signature': `sha256=${signature}`,
            'X-Opsly-Webhook-ID': webhook.id,
            'X-Opsly-Delivery-ID': `${payload.submission_id}-${Date.now()}`,
          },
          body: payloadJson,
          signal: controller.signal,
          redirect: 'error',
        });

        if (response.ok) {
          results.success += 1;
        } else {
          results.failed += 1;
          results.errors.push(
            `Webhook ${webhook.id}: HTTP ${response.status} - ${response.statusText}`
          );
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      results.failed += 1;
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.errors.push(`Webhook ${webhook.id}: ${errorMessage}`);
    }
  }

  return results;
}

export function generateWebhookSignature(payload: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
}
