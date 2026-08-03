import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyTwentyWebhookSignature } from '../webhook-verify.js';

const SECRET = 'whsec_test_secret';

function sign(timestamp: string, rawBody: string, secret = SECRET): string {
  return createHmac('sha256', secret).update(`${timestamp}:${rawBody}`).digest('hex');
}

describe('verifyTwentyWebhookSignature', () => {
  it('accepts a correctly signed, fresh payload', () => {
    const now = 1_700_000_000_000;
    const timestamp = String(now);
    const rawBody = JSON.stringify({ eventType: 'opportunity.updated', id: 'opp-1' });
    const signature = sign(timestamp, rawBody);

    const result = verifyTwentyWebhookSignature(rawBody, timestamp, signature, SECRET, {
      now: () => now,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload).toMatchObject({ eventType: 'opportunity.updated' });
    }
  });

  it('rejects a tampered payload', () => {
    const now = 1_700_000_000_000;
    const timestamp = String(now);
    const rawBody = JSON.stringify({ eventType: 'opportunity.updated', id: 'opp-1' });
    const signature = sign(timestamp, rawBody);
    const tamperedBody = JSON.stringify({ eventType: 'opportunity.updated', id: 'opp-2' });

    const result = verifyTwentyWebhookSignature(tamperedBody, timestamp, signature, SECRET, {
      now: () => now,
    });

    expect(result.ok).toBe(false);
  });

  it('rejects a signature made with the wrong secret', () => {
    const now = 1_700_000_000_000;
    const timestamp = String(now);
    const rawBody = JSON.stringify({ eventType: 'opportunity.updated' });
    const signature = sign(timestamp, rawBody, 'wrong-secret');

    const result = verifyTwentyWebhookSignature(rawBody, timestamp, signature, SECRET, {
      now: () => now,
    });

    expect(result.ok).toBe(false);
  });

  it('rejects a timestamp outside the tolerance window (replay protection)', () => {
    const now = 1_700_000_000_000;
    const staleTimestamp = String(now - 10 * 60 * 1000); // 10 minutes old
    const rawBody = JSON.stringify({ eventType: 'opportunity.updated' });
    const signature = sign(staleTimestamp, rawBody);

    const result = verifyTwentyWebhookSignature(rawBody, staleTimestamp, signature, SECRET, {
      now: () => now,
      toleranceSeconds: 300,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('tolerance');
    }
  });

  it('rejects when the secret is not configured', () => {
    const result = verifyTwentyWebhookSignature('{}', '123', 'abc', '');
    expect(result.ok).toBe(false);
  });

  it('rejects when headers are missing', () => {
    expect(verifyTwentyWebhookSignature('{}', null, 'abc', SECRET).ok).toBe(false);
    expect(verifyTwentyWebhookSignature('{}', '123', null, SECRET).ok).toBe(false);
  });

  it('rejects a malformed (non-hex) signature header without throwing', () => {
    const now = 1_700_000_000_000;
    const result = verifyTwentyWebhookSignature('{}', String(now), 'not-hex!!', SECRET, {
      now: () => now,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a body that is valid-looking but not JSON after a matching signature', () => {
    const now = 1_700_000_000_000;
    const timestamp = String(now);
    const rawBody = 'not json';
    const signature = sign(timestamp, rawBody);

    const result = verifyTwentyWebhookSignature(rawBody, timestamp, signature, SECRET, {
      now: () => now,
    });

    expect(result.ok).toBe(false);
  });
});
