export type ChallengeStatus = 'draft' | 'active' | 'completed' | 'cancelled';

export interface CreatorChallenge {
  id: string;
  title: string;
  description?: string;
  status: ChallengeStatus;
  goal: number;
  progress: number;
  createdBy: 'creator' | 'community' | 'system';
  createdAt: string;
  completedAt?: string;
}

export interface CommunityPollOption {
  id: string;
  label: string;
  votes: number;
}

export interface CommunityPoll {
  id: string;
  question: string;
  options: CommunityPollOption[];
  status: 'open' | 'closed';
  createdAt: string;
  closedAt?: string;
}

export function activateChallenge(challenge: CreatorChallenge): CreatorChallenge {
  if (challenge.status !== 'draft') throw new Error('only draft challenges can be activated');
  return { ...challenge, status: 'active' };
}

export function updateChallengeProgress(
  challenge: CreatorChallenge,
  progress: number,
  completedAt = new Date().toISOString(),
): CreatorChallenge {
  if (challenge.status !== 'active') throw new Error('challenge must be active');
  if (!Number.isFinite(progress) || progress < 0) throw new Error('progress must be non-negative');
  const next = Math.min(progress, challenge.goal);
  return {
    ...challenge,
    progress: next,
    status: next >= challenge.goal ? 'completed' : 'active',
    completedAt: next >= challenge.goal ? completedAt : undefined,
  };
}

export function castVote(poll: CommunityPoll, optionId: string): CommunityPoll {
  if (poll.status !== 'open') throw new Error('poll is closed');
  if (!poll.options.some(option => option.id === optionId)) throw new Error('unknown poll option');
  return {
    ...poll,
    options: poll.options.map(option =>
      option.id === optionId ? { ...option, votes: option.votes + 1 } : option,
    ),
  };
}

export function closePoll(poll: CommunityPoll, closedAt = new Date().toISOString()): CommunityPoll {
  if (poll.status !== 'open') throw new Error('poll is already closed');
  return { ...poll, status: 'closed', closedAt };
}

export function toChallengeEvent(challenge: CreatorChallenge) {
  return {
    type: challenge.status === 'completed' ? 'challenge.completed' : 'challenge.updated',
    payload: {
      challengeId: challenge.id,
      status: challenge.status,
      progress: challenge.progress,
      goal: challenge.goal,
    },
  };
}

export function toPollEvent(poll: CommunityPoll) {
  return {
    type: poll.status === 'closed' ? 'community.poll.closed' : 'community.poll.updated',
    payload: {
      pollId: poll.id,
      question: poll.question,
      options: poll.options.map(option => ({ id: option.id, votes: option.votes })),
    },
  };
}
