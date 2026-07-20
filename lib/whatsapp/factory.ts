/**
 * Provider factory — constructs contract stubs only.
 * Default provider name is Meta; WACRM is an explicit opt-in.
 */

import { MetaCloudWhatsAppProvider } from './meta/provider.js';
import type { WhatsAppProvider, WhatsAppProviderName } from './types.js';
import { DEFAULT_WHATSAPP_PROVIDER } from './types.js';
import { WacrmWhatsAppProvider } from './wacrm/provider.js';

export interface CreateWhatsAppProviderInput {
  tenantId: string;
  provider?: WhatsAppProviderName;
  config: Record<string, unknown>;
}

export function createWhatsAppProvider(
  input: CreateWhatsAppProviderInput
): WhatsAppProvider {
  const provider = input.provider ?? DEFAULT_WHATSAPP_PROVIDER;

  if (provider === 'meta') {
    return new MetaCloudWhatsAppProvider(input.tenantId, input.config);
  }

  if (provider === 'wacrm') {
    return new WacrmWhatsAppProvider(input.tenantId, input.config);
  }

  throw new Error(`[WhatsApp] Unsupported provider: ${provider}`);
}

/** @deprecated Prefer createWhatsAppProvider — kept for cantera naming parity. */
export class WhatsAppProviderFactory {
  static createProvider(
    tenantId: string,
    provider: WhatsAppProviderName,
    config: Record<string, unknown>
  ): WhatsAppProvider {
    return createWhatsAppProvider({ tenantId, provider, config });
  }
}
