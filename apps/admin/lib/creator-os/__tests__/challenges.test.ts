import assert from 'node:assert/strict';
import test from 'node:test';
import { activateChallenge, castVote, closePoll, toChallengeEvent, updateChallengeProgress } from '../challenges';

test('challenge can run without a game API', () => {
  const draft = {
    id: 'challenge-1',
    title: 'Win one round',
    status: 'draft' as const,
    goal: 1,
    progress: 0,
    createdBy: 'creator' as const,
    createdAt: '2026-09-12T22:00:00-04:00',
  };
  const completed = updateChallengeProgress(
    activateChallenge(draft),
    1,
    '2026-09-12T22:05:00-04:00',
  );
  assert.equal(completed.status, 'completed');
  assert.equal(toChallengeEvent(completed).type, 'challenge.completed');
});

test('community poll voting is deterministic and closes cleanly', () => {
  const poll = {
    id: 'poll-1',
    question: 'Next challenge?',
    status: 'open' as const,
    createdAt: '2026-09-12T22:00:00-04:00',
    options: [
      { id: 'sniper', label: 'Sniper only', votes: 0 },
      { id: 'pistol', label: 'Pistol only', votes: 0 },
    ],
  };
  const voted = castVote(poll, 'sniper');
  assert.equal(voted.options[0]?.votes, 1);
  assert.equal(closePoll(voted).status, 'closed');
});
