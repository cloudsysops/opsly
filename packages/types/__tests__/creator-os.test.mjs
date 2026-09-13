import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  assessCreatorEventSequence,
  parseCreatorEventEnvelopeV1,
} from '../dist/creator-os.js';

const baseEvent = {
  version: 'creator-event-v1',
  id: 'evt-1',
  idempotencyKey: 'session-1:official:123',
  type: 'game.kill',
  sessionId: 'session-1',
  sequence: 12,
  occurredAt: '2026-09-12T21:00:00-04:00',
  gameId: 'example-game',
  payload: { kills: 1 },
  provenance: {
    sourceClass: 'official-game-api',
    adapterId: 'example-official-adapter',
    fairPlayCertified: true,
    evidence: ['official API event'],
  },
};

describe('CreatorEventEnvelopeV1', () => {
  it('accepts a normalized Fair-Play event', () => {
    const parsed = parseCreatorEventEnvelopeV1(baseEvent);
    assert.equal(parsed.type, 'game.kill');
    assert.equal(parsed.provenance.fairPlayCertified, true);
  });

  it('fails closed when an unverified source claims Fair-Play certification', () => {
    assert.throws(() =>
      parseCreatorEventEnvelopeV1({
        ...baseEvent,
        provenance: {
          ...baseEvent.provenance,
          sourceClass: 'unverified-external',
          fairPlayCertified: true,
        },
      }),
    );
  });

  it('rejects malformed sequence numbers and timestamps', () => {
    assert.throws(() =>
      parseCreatorEventEnvelopeV1({
        ...baseEvent,
        sequence: -1,
      }),
    );

    assert.throws(() =>
      parseCreatorEventEnvelopeV1({
        ...baseEvent,
        occurredAt: 'not-a-timestamp',
      }),
    );
  });
});

describe('assessCreatorEventSequence', () => {
  it('detects first, next, duplicate, gap and out-of-order events', () => {
    assert.equal(assessCreatorEventSequence(null, 5).status, 'first');
    assert.equal(assessCreatorEventSequence(5, 6).status, 'next');
    assert.equal(assessCreatorEventSequence(5, 5).status, 'duplicate-or-replay');

    const gap = assessCreatorEventSequence(5, 8);
    assert.equal(gap.status, 'gap');
    if (gap.status === 'gap') {
      assert.deepEqual(gap.missing, [6, 7]);
    }

    assert.equal(assessCreatorEventSequence(5, 3).status, 'out-of-order');
  });
});
