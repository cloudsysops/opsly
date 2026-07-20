/**
 * @intcloudsysops/whatsapp — PR0 contracts (Meta-first, WACRM adapter).
 * No route wiring, persistence, or network side effects on import.
 */

export {
  DEFAULT_WHATSAPP_PROVIDER,
  type WhatsAppMessageDirection,
  type WhatsAppMessageType,
  type WhatsAppMessageStatus,
  type WhatsAppProviderName,
  type CanonicalWhatsAppContact,
  type CanonicalWhatsAppMessage,
  type CanonicalWhatsAppConversation,
  type CanonicalWhatsAppStatus,
  type CanonicalWhatsAppTemplate,
  type WhatsAppProviderHealth,
  type WhatsAppSendResult,
  type WhatsAppProvider,
  type WhatsAppProviderConfig,
} from './types.js';

export {
  type CanonicalWhatsAppWebhookEventName,
  type WhatsAppWebhookEventType,
  type CanonicalWhatsAppWebhookEvent,
  type WhatsAppWebhookRequest,
} from './events.js';

export {
  WhatsAppError,
  WhatsAppSignatureError,
  WhatsAppProviderError,
  WhatsAppNotWiredError,
} from './errors.js';

export {
  hashSha256Hex,
  hashPayload,
  verifyMetaHubSignature256,
  verifyHmacSha256Hex,
  buildMetaHubSignature256Header,
} from './signatures.js';

export {
  metaEnvSchema,
  wacrmEnvSchema,
  whatsappFeatureEnvSchema,
  whatsappEnvSchema,
  parseWhatsAppEnv,
  safeParseWhatsAppEnv,
  sendTextDtoSchema,
  metaChallengeQuerySchema,
  type WhatsAppEnvConfig,
  type SendTextDto,
  type MetaChallengeQuery,
} from './validation.js';

export { BaseWhatsAppProvider } from './provider.js';

export {
  createWhatsAppProvider,
  WhatsAppProviderFactory,
  type CreateWhatsAppProviderInput,
} from './factory.js';

export {
  MetaCloudWhatsAppProvider,
  metaWebhookPayloadSchema,
  parseMetaProviderConfig,
  type MetaProviderConfig,
  type MetaWebhookPayload,
} from './meta/index.js';

export {
  WacrmWhatsAppProvider,
  wacrmWebhookPayloadSchema,
  parseWacrmProviderConfig,
  type WacrmProviderConfig,
  type WacrmWebhookPayload,
} from './wacrm/index.js';
