/**
 * WhatsApp Provider Interface & Base Implementation
 * Implementations: WacrmWhatsAppProvider, MetaCloudWhatsAppProvider
 */

import type {
  WhatsAppProvider,
  CanonicalWhatsAppMessage,
  CanonicalWhatsAppStatus,
  CanonicalWhatsAppWebhookEvent,
  WhatsAppProviderName,
} from './types';

export abstract class BaseWhatsAppProvider implements WhatsAppProvider {
  protected tenantId: string;
  protected provider: WhatsAppProviderName;

  constructor(tenantId: string, provider: WhatsAppProviderName) {
    this.tenantId = tenantId;
    this.provider = provider;
  }

  abstract verifyWebhook(
    token: string,
    signature: string,
    payload: Record<string, unknown>
  ): Promise<boolean>;

  abstract parseInboundWebhook(payload: Record<string, unknown>): Promise<CanonicalWhatsAppWebhookEvent>;

  abstract sendTextMessage(
    contactPhone: string,
    body: string,
    metadata?: Record<string, unknown>
  ): Promise<{ messageId: string }>;

  abstract sendTemplateMessage(
    contactPhone: string,
    templateName: string,
    parameters?: Record<string, string>,
    metadata?: Record<string, unknown>
  ): Promise<{ messageId: string }>;

  abstract sendMediaMessage(
    contactPhone: string,
    mediaUrl: string,
    mediaType: 'image' | 'document' | 'audio' | 'video',
    caption?: string,
    metadata?: Record<string, unknown>
  ): Promise<{ messageId: string }>;

  abstract markMessageRead(externalMessageId: string): Promise<void>;

  abstract getMessageStatus(externalMessageId: string): Promise<CanonicalWhatsAppStatus>;

  abstract healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: Record<string, unknown> }>;

  protected logEvent(level: 'info' | 'warn' | 'error', message: string, data?: unknown) {
    const timestamp = new Date().toISOString();
    const logData = { timestamp, tenant: this.tenantId, provider: this.provider, message, data };
    console.log(`[WhatsApp:${level.toUpperCase()}]`, JSON.stringify(logData));
  }

  protected hashPayload(payload: Record<string, unknown>): string {
    return require('crypto')
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
  }
}

/**
 * Provider Factory
 */
export class WhatsAppProviderFactory {
  static createProvider(
    tenantId: string,
    provider: ProviderType,
    config: Record<string, unknown>
  ): IWhatsAppProvider {
    if (provider === 'wacrm') {
      return new WacrmWhatsAppProvider(tenantId, config);
    }

    if (provider === 'meta') {
      return new MetaCloudWhatsAppProvider(tenantId, config);
    }

    throw new Error(`[WhatsApp] Unsupported provider: ${provider}`);
  }
}

/**
 * WACRM Implementation (Primary for Peskids MVP)
 */
export class WacrmWhatsAppProvider extends BaseWhatsAppProvider {
  private baseUrl: string;
  private apiKey: string;
  private webhookSecret: string;

  constructor(tenantId: string, config: Record<string, unknown>) {
    super(tenantId, 'wacrm');
    this.baseUrl = config.baseUrl as string;
    this.apiKey = config.apiKey as string;
    this.webhookSecret = config.webhookSecret as string;

    if (!this.baseUrl || !this.apiKey) {
      throw new Error('[WACRM] Missing baseUrl or apiKey in config');
    }
  }

  async verifyWebhook(
    token: string,
    signature: string,
    payload: Record<string, unknown>
  ): Promise<boolean> {
    try {
      const expectedSignature = require('crypto')
        .createHmac('sha256', this.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      return signature === expectedSignature;
    } catch (err) {
      this.logEvent('error', 'Webhook signature verification failed', err);
      return false;
    }
  }

  async parseInboundWebhook(payload: Record<string, unknown>): Promise<CanonicalWhatsAppWebhookEvent> {
    // TODO: Implement WACRM-specific parsing
    throw new Error('[WACRM] parseInboundWebhook not yet implemented');
  }

  async sendTextMessage(
    contactPhone: string,
    body: string,
    metadata?: Record<string, unknown>
  ): Promise<{ messageId: string }> {
    // TODO: Implement WACRM send
    throw new Error('[WACRM] sendTextMessage not yet implemented');
  }

  async sendTemplateMessage(
    contactPhone: string,
    templateName: string,
    parameters?: Record<string, string>,
    metadata?: Record<string, unknown>
  ): Promise<{ messageId: string }> {
    // TODO: Implement WACRM template send
    throw new Error('[WACRM] sendTemplateMessage not yet implemented');
  }

  async sendMediaMessage(
    contactPhone: string,
    mediaUrl: string,
    mediaType: 'image' | 'document' | 'audio' | 'video',
    caption?: string,
    metadata?: Record<string, unknown>
  ): Promise<{ messageId: string }> {
    // TODO: Implement WACRM media send
    throw new Error('[WACRM] sendMediaMessage not yet implemented');
  }

  async markMessageRead(externalMessageId: string): Promise<void> {
    // TODO: Implement WACRM mark read
    throw new Error('[WACRM] markMessageRead not yet implemented');
  }

  async getMessageStatus(externalMessageId: string): Promise<CanonicalWhatsAppStatus> {
    // TODO: Implement WACRM status fetch
    throw new Error('[WACRM] getMessageStatus not yet implemented');
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: Record<string, unknown> }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'X-API-Key': this.apiKey },
      });

      if (response.ok) {
        return { status: 'healthy', details: { wacrm: 'connected', baseUrl: this.baseUrl } };
      }

      return { status: 'unhealthy', details: { statusCode: response.status } };
    } catch (err) {
      return { status: 'unhealthy', details: { error: err instanceof Error ? err.message : 'Unknown error' } };
    }
  }
}

/**
 * Meta Cloud API Implementation (Future, feature-flagged)
 */
export class MetaCloudWhatsAppProvider extends BaseWhatsAppProvider {
  private appId: string;
  private appSecret: string;
  private accessToken: string;
  private wabaId: string;
  private phoneNumberId: string;
  private apiVersion: string;

  constructor(tenantId: string, config: Record<string, unknown>) {
    super(tenantId, 'meta');
    this.appId = config.appId as string;
    this.appSecret = config.appSecret as string;
    this.accessToken = config.accessToken as string;
    this.wabaId = config.wabaId as string;
    this.phoneNumberId = config.phoneNumberId as string;
    this.apiVersion = (config.apiVersion as string) || 'v21.0';

    if (!this.appId || !this.appSecret || !this.accessToken) {
      throw new Error('[Meta] Missing required config fields');
    }
  }

  async verifyWebhook(
    token: string,
    signature: string,
    payload: Record<string, unknown>
  ): Promise<boolean> {
    try {
      // Meta uses X-Hub-Signature-256 format: sha256=<hash>
      const [algorithm, expectedHash] = signature.split('=');

      if (algorithm !== 'sha256') {
        return false;
      }

      const calculatedSignature = require('crypto')
        .createHmac('sha256', this.appSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      return calculatedSignature === expectedHash;
    } catch (err) {
      this.logEvent('error', 'Meta webhook signature verification failed', err);
      return false;
    }
  }

  async parseInboundWebhook(payload: Record<string, unknown>): Promise<CanonicalWhatsAppWebhookEvent> {
    // TODO: Implement Meta-specific parsing
    throw new Error('[Meta] parseInboundWebhook not yet implemented');
  }

  async sendTextMessage(
    contactPhone: string,
    body: string,
    metadata?: Record<string, unknown>
  ): Promise<{ messageId: string }> {
    // TODO: Implement Meta send
    throw new Error('[Meta] sendTextMessage not yet implemented');
  }

  async sendTemplateMessage(
    contactPhone: string,
    templateName: string,
    parameters?: Record<string, string>,
    metadata?: Record<string, unknown>
  ): Promise<{ messageId: string }> {
    // TODO: Implement Meta template send
    throw new Error('[Meta] sendTemplateMessage not yet implemented');
  }

  async sendMediaMessage(
    contactPhone: string,
    mediaUrl: string,
    mediaType: 'image' | 'document' | 'audio' | 'video',
    caption?: string,
    metadata?: Record<string, unknown>
  ): Promise<{ messageId: string }> {
    // TODO: Implement Meta media send
    throw new Error('[Meta] sendMediaMessage not yet implemented');
  }

  async markMessageRead(externalMessageId: string): Promise<void> {
    // TODO: Implement Meta mark read
    throw new Error('[Meta] markMessageRead not yet implemented');
  }

  async getMessageStatus(externalMessageId: string): Promise<CanonicalWhatsAppStatus> {
    // TODO: Implement Meta status fetch
    throw new Error('[Meta] getMessageStatus not yet implemented');
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: Record<string, unknown> }> {
    try {
      const response = await fetch(
        `https://graph.instagram.com/${this.apiVersion}/${this.phoneNumberId}?fields=id,verified_name`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        }
      );

      if (response.ok) {
        return { status: 'healthy', details: { meta: 'connected', phoneNumberId: this.phoneNumberId } };
      }

      return { status: 'unhealthy', details: { statusCode: response.status } };
    } catch (err) {
      return { status: 'unhealthy', details: { error: err instanceof Error ? err.message : 'Unknown error' } };
    }
  }
}
