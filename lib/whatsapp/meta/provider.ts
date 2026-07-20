/**
 * Meta Cloud WhatsApp provider — PR0 stub.
 * Signature verification is pure; outbound/inbound I/O is not wired.
 */

import { BaseWhatsAppProvider } from '../provider.js';
import {
  buildMetaHubSignature256Header,
  verifyMetaHubSignature256,
} from '../signatures.js';
import {
  parseMetaProviderConfig,
  type MetaProviderConfig,
  type MetaWebhookPayload,
  metaWebhookPayloadSchema,
} from './types.js';

export class MetaCloudWhatsAppProvider extends BaseWhatsAppProvider {
  private readonly config: MetaProviderConfig;

  constructor(tenantId: string, config: Record<string, unknown> | MetaProviderConfig) {
    super(tenantId, 'meta');
    this.config = parseMetaProviderConfig(config as Record<string, unknown>);
  }

  /**
   * Verify Meta `X-Hub-Signature-256`.
   * Prefer passing the raw HTTP body string; objects are JSON.stringified for fixtures only.
   */
  async verifyWebhook(
    _token: string,
    signature: string,
    payload: Record<string, unknown> | string
  ): Promise<boolean> {
    const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return verifyMetaHubSignature256(this.config.appSecret, rawBody, signature);
  }

  /** Challenge helper for future PR1 routes (pure compare). */
  matchesVerifyToken(token: string): boolean {
    return Boolean(this.config.verifyToken) && token === this.config.verifyToken;
  }

  parseMetaPayload(payload: Record<string, unknown>): MetaWebhookPayload {
    return metaWebhookPayloadSchema.parse(payload);
  }

  /** Test helper — builds a valid signature header for fixtures. */
  buildFixtureSignature(rawBody: string): string {
    return buildMetaHubSignature256Header(this.config.appSecret, rawBody);
  }
}
