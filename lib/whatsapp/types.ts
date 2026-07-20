/**
 * Canonical WhatsApp domain types — provider-agnostic.
 * No I/O. Safe to import from any app without side effects.
 */

export type WhatsAppMessageDirection = 'inbound' | 'outbound';
export type WhatsAppMessageType =
  | 'text'
  | 'image'
  | 'document'
  | 'audio'
  | 'video'
  | 'template'
  | 'interactive';
export type WhatsAppMessageStatus =
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'pending'
  | 'rejected';

/** Default contractual provider is Meta; WACRM is an optional adapter. */
export type WhatsAppProviderName = 'meta' | 'wacrm' | 'openwa';

export const DEFAULT_WHATSAPP_PROVIDER: WhatsAppProviderName = 'meta';

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
  /** SHA-256 of normalized payload for idempotency */
  rawEventHash: string;
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

export interface WhatsAppProviderHealth {
  status: 'healthy' | 'unhealthy' | 'disabled' | 'not_wired';
  details: Record<string, unknown>;
}

export interface WhatsAppSendResult {
  messageId: string;
}

/**
 * Provider port — implementations live under meta/ and wacrm/.
 * PR0 ships stubs only (no network).
 */
export interface WhatsAppProvider {
  readonly provider: WhatsAppProviderName;

  verifyWebhook(
    token: string,
    signature: string,
    payload: Record<string, unknown> | string
  ): Promise<boolean>;

  parseInboundWebhook(
    payload: Record<string, unknown>
  ): Promise<import('./events.js').CanonicalWhatsAppWebhookEvent>;

  sendTextMessage(
    contactPhone: string,
    body: string,
    metadata?: Record<string, unknown>
  ): Promise<WhatsAppSendResult>;

  sendTemplateMessage(
    contactPhone: string,
    templateName: string,
    parameters?: Record<string, string>,
    metadata?: Record<string, unknown>
  ): Promise<WhatsAppSendResult>;

  sendMediaMessage(
    contactPhone: string,
    mediaUrl: string,
    mediaType: 'image' | 'document' | 'audio' | 'video',
    caption?: string,
    metadata?: Record<string, unknown>
  ): Promise<WhatsAppSendResult>;

  markMessageRead(externalMessageId: string): Promise<void>;

  getMessageStatus(externalMessageId: string): Promise<CanonicalWhatsAppStatus>;

  healthCheck(): Promise<WhatsAppProviderHealth>;
}

export interface WhatsAppProviderConfig {
  tenantId: string;
  provider: WhatsAppProviderName;
}
