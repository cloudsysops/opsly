import type {
  AgentReviewerRole,
  ConsensusResult,
  DecisionReview,
  DecisionRoundStatus,
  DecisionVerdict,
} from './types.js';

export interface ConsensusOptions {
  quorumMinReviews: number;
  consensusThreshold: number;
}

export function computeConsensus(
  reviews: DecisionReview[],
  options: ConsensusOptions
): ConsensusResult {
  const approveCount = reviews.filter((r) => r.verdict === 'approve').length;
  const rejectCount = reviews.filter((r) => r.verdict === 'reject').length;
  const reviseCount = reviews.filter((r) => r.verdict === 'revise').length;
  const total = reviews.length;

  if (total < options.quorumMinReviews) {
    return {
      status: 'open',
      verdict: 'revise',
      score: 0,
      approveCount,
      rejectCount,
      reviseCount,
      summary: `Waiting for reviews (${total}/${options.quorumMinReviews} minimum).`,
    };
  }

  const approveScore = approveCount / total;
  const rejectScore = rejectCount / total;
  const reviseScore = reviseCount / total;

  if (rejectScore >= options.consensusThreshold) {
    return {
      status: 'rejected',
      verdict: 'reject',
      score: rejectScore,
      approveCount,
      rejectCount,
      reviseCount,
      summary: 'Consensus: reject — majority of reviewers rejected the proposal.',
    };
  }

  if (reviseScore >= options.consensusThreshold) {
    return {
      status: 'revise',
      verdict: 'revise',
      score: reviseScore,
      approveCount,
      rejectCount,
      reviseCount,
      summary: 'Consensus: revise — reviewers request changes before approval.',
    };
  }

  if (approveScore >= options.consensusThreshold) {
    return {
      status: 'consensus',
      verdict: 'approve',
      score: approveScore,
      approveCount,
      rejectCount,
      reviseCount,
      summary: 'Consensus: approve — majority approved the proposal.',
    };
  }

  return {
    status: 'open',
    verdict: 'revise',
    score: Math.max(approveScore, rejectScore, reviseScore),
    approveCount,
    rejectCount,
    reviseCount,
    summary: 'No majority yet — additional reviewer input required.',
  };
}

export function mapSeverityToVerdict(level: string): DecisionVerdict {
  if (level === 'critical' || level === 'high') {
    return 'reject';
  }
  if (level === 'medium') {
    return 'revise';
  }
  return 'approve';
}

export function defaultReviewerRoles(): AgentReviewerRole[] {
  return ['skeptic', 'security', 'planner'];
}

export function roundIsFinal(status: DecisionRoundStatus): boolean {
  return status === 'consensus' || status === 'rejected';
}
