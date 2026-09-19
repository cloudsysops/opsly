import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MOMENT_WEIGHTS,
  applyMomentDecision,
  bandForMomentScore,
  scoreMoment,
} from '../moment-score';

test('MomentScore weights sum to one', () => {
  const total = Object.values(MOMENT_WEIGHTS).reduce((sum, value) => sum + value, 0);
  assert.equal(total, 1);
});

test('MomentScore is deterministic and explainable', () => {
  const result = scoreMoment({
    eventRarity: 0.9,
    communityParticipation: 0.8,
    outcomeUnexpectedness: 0.85,
    playerPerformance: 0.7,
    narrativeCoherence: 0.8,
  });

  assert.equal(result.score, 0.825);
  assert.equal(result.band, 'legendary');
  assert.equal(result.shouldGenerate, true);
  assert.equal(result.autoPublish, false);
  assert.equal(result.reasons.length, 5);
  assert.equal(
    result.reasons.reduce((sum, reason) => sum + reason.contribution, 0),
    result.score
  );
});

test('thresholds follow the Creator OS thesis', () => {
  assert.equal(bandForMomentScore(0.39), 'ignore');
  assert.equal(bandForMomentScore(0.4), 'rare');
  assert.equal(bandForMomentScore(0.6), 'epic');
  assert.equal(bandForMomentScore(0.8), 'legendary');
  assert.equal(bandForMomentScore(0.95), 'mythic');
});

test('mythic candidates always require human confirmation', () => {
  const result = scoreMoment({
    eventRarity: 1,
    communityParticipation: 1,
    outcomeUnexpectedness: 1,
    playerPerformance: 1,
    narrativeCoherence: 1,
  });

  assert.equal(result.band, 'mythic');
  assert.equal(result.requiresHumanConfirmation, true);
  assert.equal(result.autoPublish, false);
});

test('invalid signals fail closed', () => {
  assert.throws(() =>
    scoreMoment({
      eventRarity: 1.1,
      communityParticipation: 0,
      outcomeUnexpectedness: 0,
      playerPerformance: 0,
      narrativeCoherence: 0,
    })
  );
});

test('creator can keep, downgrade or reject without auto-publishing', () => {
  const candidate = scoreMoment({
    eventRarity: 0.9,
    communityParticipation: 0.8,
    outcomeUnexpectedness: 0.85,
    playerPerformance: 0.7,
    narrativeCoherence: 0.8,
  });

  assert.deepEqual(applyMomentDecision(candidate, 'KEEP'), {
    decision: 'KEEP',
    status: 'kept',
    finalBand: 'legendary',
    publishApproved: false,
  });

  assert.deepEqual(applyMomentDecision(candidate, 'DOWNGRADE'), {
    decision: 'DOWNGRADE',
    status: 'downgraded',
    finalBand: 'epic',
    publishApproved: false,
  });

  assert.deepEqual(applyMomentDecision(candidate, 'REJECT'), {
    decision: 'REJECT',
    status: 'rejected',
    finalBand: null,
    publishApproved: false,
  });
});
