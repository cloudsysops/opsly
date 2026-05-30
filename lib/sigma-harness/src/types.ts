export type SigmaRuleLevel = 'informational' | 'low' | 'medium' | 'high' | 'critical';

export interface SigmaRuleSummary {
  id: string;
  title: string;
  level: SigmaRuleLevel;
  status?: string;
  description?: string;
  tags: string[];
  logsource?: Record<string, string>;
  filePath: string;
}

export type DecisionVerdict = 'approve' | 'reject' | 'revise';

export type AgentReviewerRole = 'planner' | 'skeptic' | 'security' | 'validator' | 'architect';

export interface DecisionProposal {
  topic: string;
  summary: string;
  context?: Record<string, unknown>;
  relatedRuleIds?: string[];
}

export interface DecisionReview {
  agentId: string;
  role: AgentReviewerRole;
  verdict: DecisionVerdict;
  rationale: string;
  suggestedRuleIds?: string[];
  timestamp: string;
}

export type DecisionRoundStatus = 'open' | 'consensus' | 'rejected' | 'revise';

export interface DecisionRound {
  id: string;
  tenantSlug: string;
  requestId: string;
  proposal: DecisionProposal;
  status: DecisionRoundStatus;
  reviews: DecisionReview[];
  consensus?: {
    verdict: DecisionVerdict;
    score: number;
    summary: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type HarnessEventType =
  | 'decision_opened'
  | 'review_submitted'
  | 'consensus_reached'
  | 'correction_requested';

export interface HarnessEvent {
  type: HarnessEventType;
  roundId: string;
  tenantSlug: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface ConsensusResult {
  status: DecisionRoundStatus;
  verdict: DecisionVerdict;
  score: number;
  approveCount: number;
  rejectCount: number;
  reviseCount: number;
  summary: string;
}
