/**
 * Canonical WhatsApp Types — Provider-agnostic
 * Used by Peskids, future clients, ICSO, Opsly
 */

export type WhatsAppMessageDirection = 'inbound' | 'outbound';
export type WhatsAppMessageType = 'text' | 'image' | 'document' | 'audio' | 'video' | 'template' | 'interactive';
export type WhatsAppMessageStatus = 'sent' | 'delivered' | 'read' | 'failed' | 'pending' | 'rejected';
export type WhatsAppProviderName = 'wacrm' | 'meta' | 'openwa';

export interface CanonicalWhatsAppContact {
  id: string;
  tenantId: string;
  externalContactId: string;
  phoneNumber: string;
  displayName?: string;
  email?: string;
  isGroup: boolean;
  provider: WhatsAppProviderName;
  lastMessageAt: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CanonicalWhatsAppMessage {
  id: string;
  tenantId: string;
  externalMessageId: string;
  externalConversationId: string;
  contactId: string;
  phoneNumberId: string;
  contactPhone: string;
  contactName?: string;
  direction: WhatsAppMessageDirection;
  messageType: WhatsAppMessageType;
  body: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'document' | 'audio' | 'video';
  status: WhatsAppMessageStatus;
  provider: WhatsAppProviderName;
  timestamp: Date;
  rawEventHash: string; // SHA256 of payload for idempotence
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CanonicalWhatsAppConversation {
  id: string;
  tenantId: string;
  externalConversationId: string;
  contactId: string;
  phoneNumber: string;
  displayName?: string;
  lastMessageBody?: string;
  lastMessageAt: Date;
  messageCount: number;
  provider: WhatsAppProviderName;
  status: 'active' | 'archived' | 'closed';
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CanonicalWhatsAppStatus {
  messageId: string;
  externalMessageId: string;
  status: WhatsAppMessageStatus;
  timestamp: Date;
  recipientId?: string;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface CanonicalWhatsAppTemplate {
  id: string;
  tenantId: string;
  externalTemplateId: string;
  name: string;
  language: string;
  category: 'MARKETING' | 'OTP' | 'TRANSACTIONAL' | 'UTILITY';
  body: string;
  headerType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  headerText?: string;
  footerText?: string;
  buttons?: Array<{ type: string; text: string }>;
  status: 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED' | 'PAUSED' | 'DISABLED';
  provider: WhatsAppProviderName;
  createdAt: Date;
  updatedAt: Date;
}

export interface CanonicalWhatsAppWebhookEvent {
  event: 'message.inbound' | 'message.outbound' | 'message.status' | 'template.status' | 'error';
  tenantId: string;
  provider: WhatsAppProviderName;
  timestamp: Date;
  data: CanonicalWhatsAppMessage | CanonicalWhatsAppStatus | { error: string };
  rawPayload: Record<string, unknown>;
  signature?: string;
  idempotencyKey: string;
}

/**
 * Provider Interface — Implementations: WacrmWhatsAppProvider, MetaCloudWhatsAppProvider
 */
export interface WhatsAppProvider {
  verifyWebhook(token: string, signature: string, payload: Record<string, unknown>): Promise<boolean>;
  parseInboundWebhook(payload: Record<string, unknown>): Promise<CanonicalWhatsAppWebhookEvent>;
  sendTextMessage(contactPhone: string, body: string, metadata?: Record<string, unknown>): Promise<{ messageId: string }>;
  sendTemplateMessage(
    contactPhone: string,
    templateName: string,
    parameters?: Record<string, string>,
    metadata?: Record<string, unknown>
  ): Promise<{ messageId: string }>;
  sendMediaMessage(
    contactPhone: string,
    mediaUrl: string,
    mediaType: 'image' | 'document' | 'audio' | 'video',
    caption?: string,
    metadata?: Record<string, unknown>
  ): Promise<{ messageId: string }>;
  markMessageRead(externalMessageId: string): Promise<void>;
  getMessageStatus(externalMessageId: string): Promise<CanonicalWhatsAppStatus>;
  healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: Record<string, unknown> }>;
}

/**
 * Webhook Event Types for routing/handling
 */
export type WhatsAppWebhookEventType = 'message' | 'status' | 'template' | 'error';

export interface WhatsAppWebhookRequest {
  event: WhatsAppWebhookEventType;
  timestamp: number;
  tenantId: string;
  provider: WhatsAppProviderName;
  signature: string;
  payload: Record<string, unknown>;
}

/**
 * Error Types
 */
export class WhatsAppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public provider: WhatsAppProviderName,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'WhatsAppError';
  }
}

export class WhatsAppSignatureError extends WhatsAppError {
  constructor(provider: WhatsAppProvider) {
    super('SIGNATURE_INVALID', 'Webhook signature validation failed', provider);
    this.name = 'WhatsAppSignatureError';
  }
}

export class WhatsAppProviderError extends WhatsAppError {
  constructor(
    provider: WhatsAppProvider,
    message: string,
    details?: Record<string, unknown>
  ) {
    super('PROVIDER_ERROR', message, provider, details);
    this.name = 'WhatsAppProviderError';
  }
}
