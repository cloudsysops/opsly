/**
 * Canonical webhook / domain events for WhatsApp integrations.
 */

import type {
  CanonicalWhatsAppMessage,
  CanonicalWhatsAppStatus,
  WhatsAppProviderName,
} from './types.js';

export type CanonicalWhatsAppWebhookEventName =
  | 'message.inbound'
  | 'message.outbound'
  | 'message.status'
  | 'template.status'
  | 'error';

export type WhatsAppWebhookEventType = 'message' | 'status' | 'template' | 'error';

export interface CanonicalWhatsAppWebhookEvent {
  event: CanonicalWhatsAppWebhookEventName;
  tenantId: string;
  provider: WhatsAppProviderName;
  timestamp: Date;
  data: CanonicalWhatsAppMessage | CanonicalWhatsAppStatus | { error: string };
  rawPayload: Record<string, unknown>;
  signature?: string;
  idempotencyKey: string;
}

export interface WhatsAppWebhookRequest {
  event: WhatsAppWebhookEventType;
  timestamp: number;
  tenantId: string;
  provider: WhatsAppProviderName;
  signature: string;
  payload: Record<string, unknown>;
}
