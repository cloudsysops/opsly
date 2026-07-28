/** Shared WhatsApp channel types — tenant-agnostic. */

export type WhatsAppProviderKind = 'meta_cloud' | 'wacrm' | 'stub';

export type WhatsAppLifecycleState = 'stub' | 'configured' | 'ready' | 'enabled';

export type NormalizedDirection = 'inbound' | 'outbound' | 'status';

export interface NormalizedWhatsAppMessage {
  provider: WhatsAppProviderKind;
  tenantSlug: string;
  /** Message-level id (wamid / provider message id) */
  externalId: string;
  /** Thread id (wa_id + phone_number_id or conversation id) */
  externalConversationId: string;
  direction: NormalizedDirection;
  phone: string;
  contactName?: string;
  body: string;
  timestamp: number;
  status?: string;
  raw: unknown;
}

export interface WhatsAppSendRequest {
  tenantSlug: string;
  toPhone: string;
  body: string;
  /** Correlation to outbox / parent message */
  idempotencyKey: string;
  externalConversationId?: string;
}

export interface WhatsAppSendResult {
  ok: boolean;
  externalId?: string;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

export interface WhatsAppProvider {
  readonly kind: WhatsAppProviderKind;
  sendText(request: WhatsAppSendRequest): Promise<WhatsAppSendResult>;
}

export interface MetaCloudEnvConfig {
  tenantSlug: string;
  /** Master + inbound flags must be true for live receive */
  enabled: boolean;
  inboundEnabled: boolean;
  outboundEnabled: boolean;
  verifyToken: string;
  appSecret: string;
  accessToken: string;
  phoneNumberId: string;
  wabaId: string;
  apiVersion: string;
  lifecycle: WhatsAppLifecycleState;
}

export interface OutboxRecord {
  id: string;
  tenantSlug: string;
  toPhone: string;
  body: string;
  status: 'pending_approval' | 'approved' | 'sending' | 'sent' | 'failed' | 'cancelled';
  externalId?: string;
  externalConversationId?: string;
  parentMessageId?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}
