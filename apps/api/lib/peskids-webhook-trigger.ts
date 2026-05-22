import { createHmac } from 'crypto';

interface WebhookTriggerPayload {
  form_id: string;
  submission_id: string;
  tenant_slug: string;
  form_data: Record<string, unknown>;
  timestamp: number;
  user_id?: string;
}

interface WebhookConfig {
  id: string;
  webhook_url: string;
  secret: string;
  is_active: boolean;
  failure_count: number;
}

export async function triggerWebhooks(
  webhooks: WebhookConfig[],
  payload: WebhookTriggerPayload
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const webhook of webhooks) {
    if (!webhook.is_active) {
      continue;
    }

    try {
      const payloadJson = JSON.stringify(payload);
      const signature = createHmac('sha256', webhook.secret)
        .update(payloadJson)
        .digest('hex');

      const response = await fetch(webhook.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Opsly-Signature': `sha256=${signature}`,
          'X-Opsly-Webhook-ID': webhook.id,
          'X-Opsly-Delivery-ID': `${payload.submission_id}-${Date.now()}`,
        },
        body: payloadJson,
        timeout: 10000, // 10 second timeout
      });

      if (response.ok) {
        results.success += 1;
      } else {
        results.failed += 1;
        results.errors.push(
          `Webhook ${webhook.id}: HTTP ${response.status} - ${response.statusText}`
        );
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
  return `sha256=${createHmac('sha256', secret)
    .update(payload)
    .digest('hex')}`;
}
