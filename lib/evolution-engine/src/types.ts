/**
 * Types para Evolution Engine
 */

export interface ChangeProposal {
  id: string;
  title: string;
  description: string;
  type: 'integrate' | 'enhance' | 'refactor' | 'optimize' | 'breaking';
  impactArea: string[];
  estimatedEffort: 'small' | 'medium' | 'large';
  verificationCriteria: string[];
  dependencies: string[];
  rollbackPlan: string;
}

export interface VerificationResult {
  proposalId: string;
  passedChecks: string[];
  failedChecks: string[];
  warnings: string[];
  recommendation: 'approved' | 'needs_review' | 'rejected' | 'pending';
  confidence: number; // 0-100
}

export interface EvolutionReport {
  timestamp: Date;
  totalProposals: number;
  approvedCount: number;
  needsReviewCount: number;
  rejectedCount: number;
  proposals: Array<{
    proposal: ChangeProposal;
    verification: VerificationResult;
  }>;
  summaryForReviewer: string;
  nextSteps: string[];
}
