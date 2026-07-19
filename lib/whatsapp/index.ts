/**
 * WhatsApp Module — Main exports
 */

export { whatsappConfig } from './env-config';
export type { WhatsAppEnvConfig } from './env-config';

export {
  type CanonicalWhatsAppContact,
  type CanonicalWhatsAppMessage,
  type CanonicalWhatsAppConversation,
  type CanonicalWhatsAppStatus,
  type CanonicalWhatsAppTemplate,
  type CanonicalWhatsAppWebhookEvent,
  type WhatsAppProvider,
  type WhatsAppWebhookEventType,
  type WhatsAppWebhookRequest,
  type WhatsAppMessageDirection,
  type WhatsAppMessageType,
  type WhatsAppMessageStatus,
  type WhatsAppProvider as WhatsAppProviderType,
  WhatsAppError,
  WhatsAppSignatureError,
  WhatsAppProviderError,
} from './types';

export {
  BaseWhatsAppProvider,
  WhatsAppProviderFactory,
  WacrmWhatsAppProvider,
  MetaCloudWhatsAppProvider,
} from './provider';
