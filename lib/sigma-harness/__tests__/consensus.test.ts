import { describe, expect, it } from 'vitest';
import { computeConsensus } from '../src/consensus.js';
import type { DecisionReview } from '../src/types.js';

const baseOptions = { quorumMinReviews: 2, consensusThreshold: 0.66 };

function review(role: DecisionReview['role'], verdict: DecisionReview['verdict']): DecisionReview {
  return {
    agentId: `${role}-1`,
    role,
    verdict,
    rationale: 'test',
    timestamp: new Date().toISOString(),
  };
}

describe('computeConsensus', () => {
  it('waits for quorum', () => {
    const result = computeConsensus([review('skeptic', 'approve')], baseOptions);
    expect(result.status).toBe('open');
  });

  it('approves with majority', () => {
    const result = computeConsensus(
      [review('skeptic', 'approve'), review('security', 'approve'), review('planner', 'reject')],
      baseOptions
    );
    expect(result.status).toBe('consensus');
    expect(result.verdict).toBe('approve');
  });

  it('rejects with majority', () => {
    const result = computeConsensus(
      [review('skeptic', 'reject'), review('security', 'reject')],
      baseOptions
    );
    expect(result.status).toBe('rejected');
  });
});
