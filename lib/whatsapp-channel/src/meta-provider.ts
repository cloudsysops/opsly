import type { MetaCloudEnvConfig } from './types.js';
import { isMetaOutboundAllowed } from './env-config.js';
import type {
  WhatsAppProvider,
  WhatsAppSendRequest,
  WhatsAppSendResult,
} from './types.js';

/**
 * Meta Cloud API text sender.
 * Refuses to send when outbound flags/credentials are off (never marks sent).
 */
export class MetaCloudWhatsAppProvider implements WhatsAppProvider {
  readonly kind = 'meta_cloud' as const;

  constructor(
    private readonly config: MetaCloudEnvConfig,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async sendText(request: WhatsAppSendRequest): Promise<WhatsAppSendResult> {
    if (!isMetaOutboundAllowed(this.config)) {
      return {
        ok: false,
        skipped: true,
        reason: 'outbound_disabled_or_unconfigured',
        error: 'WhatsApp outbound is disabled or missing credentials',
      };
    }

    const url = `https://graph.facebook.com/${this.config.apiVersion}/${this.config.phoneNumberId}/messages`;
    const res = await this.fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: request.toPhone.replace(/\D/g, ''),
        type: 'text',
        text: { body: request.body },
      }),
    });

    const json = (await res.json().catch(() => ({}))) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      return {
        ok: false,
        error: json.error?.message ?? `Meta API HTTP ${res.status}`,
      };
    }

    const externalId = json.messages?.[0]?.id;
    return { ok: true, externalId };
  }
}

/** Stub provider for health/proxy — never sends. */
export class StubWhatsAppProvider implements WhatsAppProvider {
  readonly kind = 'stub' as const;

  async sendText(_request: WhatsAppSendRequest): Promise<WhatsAppSendResult> {
    return {
      ok: false,
      skipped: true,
      reason: 'stub_provider',
      error: 'Stub provider cannot send',
    };
  }
}
