/**
 * Shared OpenWA types — tenant-agnostic.
 * Aligned to https://github.com/rmyndharis/OpenWA API (v2025+).
 */

export interface OpenWAConfig {
  /** Base URL including /api suffix, e.g. http://openwa-peskids:2785/api */
  apiUrl: string;
  apiKey: string;
  /** OpenWA session id (sess_…) — not the display name */
  sessionId: string;
}

/** Status values returned by OpenWA REST API */
export type SessionStatusKind =
  | 'INITIALIZING'
  | 'SCAN_QR'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'FAILED'
  | 'STOPPED'
  | 'STARTING';

export interface SessionStatus {
  id: string;
  name?: string;
  status: SessionStatusKind;
  phoneNumber?: string;
  qrCode?: string;
}

export interface SendTextResult {
  id: string;
  status?: string;
}

export interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  active?: boolean;
  secret?: string;
}

export type OpenWAEventName =
  | 'message'
  | 'message.received'
  | 'message.sent'
  | 'message.ack'
  | 'session.status'
  | string;

export interface OpenWAMessageData {
  id: string;
  body?: string;
  from: string;
  to?: string;
  fromMe?: boolean;
  type?: string;
  timestamp?: string;
  waTimestamp?: number;
  hasMedia?: boolean;
  mediaUrl?: string;
  isGroup?: boolean;
}

export interface OpenWAWebhookPayload {
  event: OpenWAEventName;
  timestamp?: string;
  sessionId?: string;
  session?: string;
  deliveryId?: string;
  idempotencyKey?: string;
  signature?: string;
  data: OpenWAMessageData;
}

/** Normalised inbound message for tenant handlers */
export interface InboundWhatsAppMessage {
  sender: string;
  chatId: string;
  text: string;
  timestamp: number;
  hasMedia: boolean;
  mediaUrl?: string;
  rawEvent: OpenWAWebhookPayload;
}

export interface OpenWASetupResult {
  session: SessionStatus;
  qrCode?: string;
}

export interface OpenWARegisterWebhookResult {
  session: SessionStatus;
  webhook: WebhookConfig | undefined;
  webhookUrl: string;
  alreadyRegistered: boolean;
}
