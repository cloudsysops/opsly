/**
 * WACRM adapter — contract types (optional Meta sidecar; not default provider).
 */

import { z } from 'zod';

export const wacrmWebhookPayloadSchema = z
  .object({
    event: z.string().optional(),
    message: z.record(z.unknown()).optional(),
    data: z.record(z.unknown()).optional(),
  })
  .passthrough();

export type WacrmWebhookPayload = z.infer<typeof wacrmWebhookPayloadSchema>;

export interface WacrmProviderConfig {
  baseUrl: string;
  apiKey: string;
  webhookSecret: string;
}

export function parseWacrmProviderConfig(
  config: Record<string, unknown>
): WacrmProviderConfig {
  const baseUrl = String(config.baseUrl ?? '');
  const apiKey = String(config.apiKey ?? '');
  const webhookSecret = String(config.webhookSecret ?? '');

  if (!baseUrl || !apiKey) {
    throw new Error('[WACRM] baseUrl and apiKey are required for contract construction');
  }

  return { baseUrl, apiKey, webhookSecret };
}
