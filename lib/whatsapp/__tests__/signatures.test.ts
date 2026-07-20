import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  buildMetaHubSignature256Header,
  hashPayload,
  verifyHmacSha256Hex,
  verifyMetaHubSignature256,
} from '../signatures.js';

describe('signatures', () => {
  it('verifies Meta X-Hub-Signature-256 against raw body', () => {
    const secret = 'test-app-secret';
    const rawBody = '{"object":"whatsapp_business_account"}';
    const header = buildMetaHubSignature256Header(secret, rawBody);

    expect(verifyMetaHubSignature256(secret, rawBody, header)).toBe(true);
    expect(verifyMetaHubSignature256(secret, rawBody, 'md5=deadbeef')).toBe(false);
    expect(verifyMetaHubSignature256(secret, rawBody + 'x', header)).toBe(false);
  });

  it('verifies HMAC-SHA256 hex for adapter-style webhooks', () => {
    const secret = 'adapter-secret';
    const rawBody = '{"event":"message"}';
    const signature = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');

    expect(verifyHmacSha256Hex(secret, rawBody, signature)).toBe(true);
    expect(verifyHmacSha256Hex(secret, rawBody, '00')).toBe(false);
  });

  it('hashes payloads deterministically', () => {
    expect(hashPayload({ a: 1 })).toBe(hashPayload({ a: 1 }));
    expect(hashPayload({ a: 1 })).not.toBe(hashPayload({ a: 2 }));
  });
});
