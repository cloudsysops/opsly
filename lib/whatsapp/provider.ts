/**
 * Abstract WhatsApp provider — contract only.
 * Subclasses must not perform network I/O in PR0 stubs.
 */

import { WhatsAppNotWiredError } from './errors.js';
import type { CanonicalWhatsAppWebhookEvent } from './events.js';
import type {
  CanonicalWhatsAppStatus,
  WhatsAppProvider,
  WhatsAppProviderHealth,
  WhatsAppProviderName,
  WhatsAppSendResult,
} from './types.js';

export abstract class BaseWhatsAppProvider implements WhatsAppProvider {
  readonly provider: WhatsAppProviderName;
  protected readonly tenantId: string;

  constructor(tenantId: string, provider: WhatsAppProviderName) {
    if (!tenantId.trim()) {
      throw new Error('[WhatsApp] tenantId is required');
    }
    this.tenantId = tenantId;
    this.provider = provider;
  }

  abstract verifyWebhook(
    token: string,
    signature: string,
    payload: Record<string, unknown> | string
  ): Promise<boolean>;

  async parseInboundWebhook(
    _payload: Record<string, unknown>
  ): Promise<CanonicalWhatsAppWebhookEvent> {
    throw new WhatsAppNotWiredError(this.provider, 'parseInboundWebhook');
  }

  async sendTextMessage(
    _contactPhone: string,
    _body: string,
    _metadata?: Record<string, unknown>
  ): Promise<WhatsAppSendResult> {
    throw new WhatsAppNotWiredError(this.provider, 'sendTextMessage');
  }

  async sendTemplateMessage(
    _contactPhone: string,
    _templateName: string,
    _parameters?: Record<string, string>,
    _metadata?: Record<string, unknown>
  ): Promise<WhatsAppSendResult> {
    throw new WhatsAppNotWiredError(this.provider, 'sendTemplateMessage');
  }

  async sendMediaMessage(
    _contactPhone: string,
    _mediaUrl: string,
    _mediaType: 'image' | 'document' | 'audio' | 'video',
    _caption?: string,
    _metadata?: Record<string, unknown>
  ): Promise<WhatsAppSendResult> {
    throw new WhatsAppNotWiredError(this.provider, 'sendMediaMessage');
  }

  async markMessageRead(_externalMessageId: string): Promise<void> {
    throw new WhatsAppNotWiredError(this.provider, 'markMessageRead');
  }

  async getMessageStatus(
    _externalMessageId: string
  ): Promise<CanonicalWhatsAppStatus> {
    throw new WhatsAppNotWiredError(this.provider, 'getMessageStatus');
  }

  async healthCheck(): Promise<WhatsAppProviderHealth> {
    return {
      status: 'not_wired',
      details: {
        provider: this.provider,
        tenantId: this.tenantId,
        note: 'PR0 contracts only — no runtime provider calls',
      },
    };
  }
}
