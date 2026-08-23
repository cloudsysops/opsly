import { describe, expect, it } from 'vitest';
import { parseInboundMessage, senderFromJid, verifySignature } from '../src/verify.js';
import type { OpenWAWebhookPayload } from '../src/types.js';

describe('parseInboundMessage', () => {
  it('parses message.received', () => {
    const payload: OpenWAWebhookPayload = {
      event: 'message.received',
      sessionId: 'sess_1',
      data: {
        id: 'msg_1',
        from: '573001234567@c.us',
        body: 'Hola',
        waTimestamp: 1706868000,
        hasMedia: false,
      },
    };
    const msg = parseInboundMessage(payload);
    expect(msg?.sender).toBe('573001234567');
    expect(msg?.text).toBe('Hola');
  });

  it('skips outbound messages', () => {
    const payload: OpenWAWebhookPayload = {
      event: 'message.received',
      data: {
        id: 'msg_2',
        from: '573001234567@c.us',
        body: 'x',
        fromMe: true,
      },
    };
    expect(parseInboundMessage(payload)).toBeNull();
  });
});

describe('senderFromJid', () => {
  it('strips c.us suffix', () => {
    expect(senderFromJid('573001234567@c.us')).toBe('573001234567');
  });
});

describe('verifySignature', () => {
  it('SECURITY: fails closed when no secret is configured, even with a valid-looking signature', async () => {
    const ok = await verifySignature('{"event":"message"}', 'sha256=deadbeef', undefined, undefined);
    expect(ok).toBe(false);
  });

  it('rejects when secret is configured but signature header is missing', async () => {
    const ok = await verifySignature('{"event":"message"}', null, 'test-secret', undefined);
    expect(ok).toBe(false);
  });

  it('rejects an invalid signature when a secret is configured', async () => {
    const ok = await verifySignature('{"event":"message"}', 'sha256=deadbeef', 'test-secret', undefined);
    expect(ok).toBe(false);
  });

  it('accepts a valid HMAC signature over the raw body', async () => {
    const crypto = await import('node:crypto');
    const rawBody = '{"event":"message"}';
    const expected = crypto.createHmac('sha256', 'test-secret').update(rawBody).digest('hex');
    const ok = await verifySignature(rawBody, `sha256=${expected}`, 'test-secret', undefined);
    expect(ok).toBe(true);
  });
});
