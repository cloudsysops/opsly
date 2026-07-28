import { describe, expect, it } from 'vitest';
import {
  assessWhatsAppReadiness,
  createMemoryOutboxStore,
  dispatchApprovedOutbound,
  enqueueOutboundForApproval,
  normalizeMetaWebhookPayload,
  resolveMetaCloudForTenant,
  resolveMetaVerifyChallenge,
  StubWhatsAppProvider,
  verifyMetaSignature,
  whatsappIdempotencyKey,
} from '../src/index.js';

describe('resolveMetaCloudForTenant', () => {
  it('defaults to stub with flags off', () => {
    const cfg = resolveMetaCloudForTenant('peskids', {});
    expect(cfg.enabled).toBe(false);
    expect(cfg.lifecycle).toBe('stub');
  });

  it('becomes configured when secrets present but flags off', () => {
    const cfg = resolveMetaCloudForTenant('peskids', {
      META_WHATSAPP_APP_SECRET: 'secret',
      META_WHATSAPP_VERIFY_TOKEN: 'tok',
      META_WHATSAPP_PHONE_NUMBER_ID: '123',
    });
    expect(cfg.lifecycle).toBe('configured');
    expect(cfg.enabled).toBe(false);
  });
});

describe('meta verify + signature', () => {
  it('accepts valid verify challenge', () => {
    const r = resolveMetaVerifyChallenge({
      mode: 'subscribe',
      token: 'abc',
      challenge: '99',
      expectedToken: 'abc',
    });
    expect(r).toEqual({ ok: true, challenge: '99' });
  });

  it('rejects bad verify token', () => {
    const r = resolveMetaVerifyChallenge({
      mode: 'subscribe',
      token: 'bad',
      challenge: '99',
      expectedToken: 'abc',
    });
    expect(r.ok).toBe(false);
  });

  it('verifies hmac signature', async () => {
    const body = '{"object":"whatsapp_business_account"}';
    const secret = 'test-secret';
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
    const hex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    await expect(verifyMetaSignature(body, `sha256=${hex}`, secret)).resolves.toBe(true);
    await expect(verifyMetaSignature(body, 'sha256=deadbeef', secret)).resolves.toBe(false);
  });
});

describe('normalizeMetaWebhookPayload', () => {
  it('extracts inbound text messages', () => {
    const msgs = normalizeMetaWebhookPayload('peskids', {
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: 'pn1' },
                contacts: [{ wa_id: '573001112233', profile: { name: 'Ana' } }],
                messages: [
                  {
                    from: '573001112233',
                    id: 'wamid.ABC',
                    timestamp: '1700000000',
                    type: 'text',
                    text: { body: 'Hola' },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    expect(msgs).toHaveLength(1);
    expect(msgs[0]?.externalId).toBe('wamid.ABC');
    expect(msgs[0]?.externalConversationId).toBe('pn1:573001112233');
    expect(msgs[0]?.body).toBe('Hola');
    expect(msgs[0]?.contactName).toBe('Ana');
  });
});

describe('outbox approval-first', () => {
  it('does not mark sent when provider is stub', async () => {
    const store = createMemoryOutboxStore();
    const key = whatsappIdempotencyKey('peskids', 'out-1');
    const row = await enqueueOutboundForApproval(store, {
      tenantSlug: 'peskids',
      toPhone: '573001112233',
      body: 'hola',
      idempotencyKey: key,
    });
    expect(row.status).toBe('pending_approval');

    const result = await dispatchApprovedOutbound(store, new StubWhatsAppProvider(), key, {
      tenantSlug: 'peskids',
      toPhone: '573001112233',
      body: 'hola',
      idempotencyKey: key,
    });
    expect(result.ok).toBe(false);
    expect(result.skipped).toBe(true);
    const after = await store.getByIdempotencyKey(key);
    expect(after?.status).toBe('failed');
  });
});

describe('readiness', () => {
  it('reports stub when transport missing', () => {
    const r = assessWhatsAppReadiness(
      resolveMetaCloudForTenant('peskids', { PESKIDS_WHATSAPP_ENABLED: 'true' })
    );
    expect(r.transportReal).toBe(false);
    expect(r.lifecycle).toBe('stub');
  });
});
