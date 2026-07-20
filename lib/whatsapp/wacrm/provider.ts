/**
 * WACRM WhatsApp adapter — PR0 stub.
 * Optional adapter under Meta-first architecture. No network I/O.
 */

import { BaseWhatsAppProvider } from '../provider.js';
import { verifyHmacSha256Hex } from '../signatures.js';
import {
  parseWacrmProviderConfig,
  type WacrmProviderConfig,
  type WacrmWebhookPayload,
  wacrmWebhookPayloadSchema,
} from './types.js';

export class WacrmWhatsAppProvider extends BaseWhatsAppProvider {
  private readonly config: WacrmProviderConfig;

  constructor(tenantId: string, config: Record<string, unknown> | WacrmProviderConfig) {
    super(tenantId, 'wacrm');
    this.config = parseWacrmProviderConfig(config as Record<string, unknown>);
  }

  async verifyWebhook(
    _token: string,
    signature: string,
    payload: Record<string, unknown> | string
  ): Promise<boolean> {
    if (!this.config.webhookSecret) {
      return false;
    }
    const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return verifyHmacSha256Hex(this.config.webhookSecret, rawBody, signature);
  }

  parseWacrmPayload(payload: Record<string, unknown>): WacrmWebhookPayload {
    return wacrmWebhookPayloadSchema.parse(payload);
  }
}
