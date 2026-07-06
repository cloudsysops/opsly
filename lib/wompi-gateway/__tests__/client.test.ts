import { describe, expect, it } from 'vitest';
import { verifyWompiWebhookSignature } from '../src/client.js';

const SECRET = 'test-secret';
// sha256("txn_1" + "APPROVED" + "1700000000" + "test-secret")
const VALID_CHECKSUM = '6308801a610a8a142aeef62098de585ce2cb5a8a10701c2fb8391c531e5bc347';

function buildPayload(checksum: string): string {
  return JSON.stringify({
    event: 'transaction.updated',
    data: { transaction: { id: 'txn_1', status: 'APPROVED' } },
    timestamp: 1700000000,
    signature: {
      checksum,
      properties: ['transaction.id', 'transaction.status'],
    },
  });
}

describe('verifyWompiWebhookSignature', () => {
  it('accepts a correctly signed event', () => {
    const event = verifyWompiWebhookSignature(buildPayload(VALID_CHECKSUM), SECRET);
    expect(event).not.toBeNull();
    expect(event?.data.transaction).toEqual({ id: 'txn_1', status: 'APPROVED' });
  });

  it('rejects a tampered checksum', () => {
    const event = verifyWompiWebhookSignature(buildPayload('0'.repeat(64)), SECRET);
    expect(event).toBeNull();
  });

  it('rejects when the secret is missing', () => {
    const event = verifyWompiWebhookSignature(buildPayload(VALID_CHECKSUM), '');
    expect(event).toBeNull();
  });

  it('rejects malformed JSON', () => {
    expect(verifyWompiWebhookSignature('not json', SECRET)).toBeNull();
  });

  it('rejects a checksum of the wrong length instead of throwing', () => {
    expect(verifyWompiWebhookSignature(buildPayload('abc'), SECRET)).toBeNull();
  });
});
