import { describe, expect, it } from 'vitest';

import { WhatsAppNotWiredError } from '../errors.js';
import { createWhatsAppProvider, WhatsAppProviderFactory } from '../factory.js';
import { MetaCloudWhatsAppProvider } from '../meta/provider.js';
import { DEFAULT_WHATSAPP_PROVIDER } from '../types.js';
import { parseWhatsAppEnv } from '../validation.js';
import { WacrmWhatsAppProvider } from '../wacrm/provider.js';

describe('WhatsApp contracts', () => {
  it('defaults contractual provider to meta', () => {
    expect(DEFAULT_WHATSAPP_PROVIDER).toBe('meta');
    const parsed = parseWhatsAppEnv({});
    expect(parsed.WHATSAPP_PROVIDER).toBe('meta');
    expect(parsed.WHATSAPP_ENABLED).toBe(false);
    expect(parsed.META_WEBHOOK_ENABLED).toBe(false);
    expect(parsed.WACRM_ENABLED).toBe(false);
  });

  it('factory defaults to Meta and constructs WACRM only when requested', () => {
    const meta = createWhatsAppProvider({
      tenantId: 'tenant-demo',
      config: {
        appId: 'app',
        appSecret: 'secret',
        verifyToken: 'verify',
        accessToken: '',
        wabaId: '',
        phoneNumberId: '',
      },
    });
    expect(meta).toBeInstanceOf(MetaCloudWhatsAppProvider);
    expect(meta.provider).toBe('meta');

    const wacrm = WhatsAppProviderFactory.createProvider('tenant-demo', 'wacrm', {
      baseUrl: 'https://example.invalid',
      apiKey: 'key',
      webhookSecret: 'whsec',
    });
    expect(wacrm).toBeInstanceOf(WacrmWhatsAppProvider);
    expect(wacrm.provider).toBe('wacrm');
  });

  it('Meta signature verify works; outbound stays not_wired', async () => {
    const provider = new MetaCloudWhatsAppProvider('tenant-demo', {
      appId: 'app',
      appSecret: 'secret',
      verifyToken: 'verify-token',
      accessToken: '',
      wabaId: '',
      phoneNumberId: '',
    });

    const rawBody = '{"entry":[]}';
    const signature = provider.buildFixtureSignature(rawBody);
    await expect(provider.verifyWebhook('', signature, rawBody)).resolves.toBe(true);
    expect(provider.matchesVerifyToken('verify-token')).toBe(true);
    expect(provider.matchesVerifyToken('nope')).toBe(false);

    const health = await provider.healthCheck();
    expect(health.status).toBe('not_wired');

    await expect(provider.sendTextMessage('+10000000000', 'hi')).rejects.toBeInstanceOf(
      WhatsAppNotWiredError
    );
  });

  it('WACRM adapter verifies HMAC without network', async () => {
    const provider = new WacrmWhatsAppProvider('tenant-demo', {
      baseUrl: 'https://example.invalid',
      apiKey: 'key',
      webhookSecret: 'whsec',
    });

    const payload = { event: 'message' };
    const raw = JSON.stringify(payload);
    const { createHmac } = await import('node:crypto');
    const signature = createHmac('sha256', 'whsec').update(raw, 'utf8').digest('hex');

    await expect(provider.verifyWebhook('', signature, payload)).resolves.toBe(true);
    await expect(provider.verifyWebhook('', 'bad', payload)).resolves.toBe(false);

    const health = await provider.healthCheck();
    expect(health.status).toBe('not_wired');
  });
});
