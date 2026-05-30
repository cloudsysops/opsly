import { describe, expect, it } from 'vitest';
import { parseInboundMessage, senderFromJid } from '../src/verify.js';
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
