import type { BranchCleanupState } from './types.js';

export interface BranchCleanupEvidence {
  hasOpenPr: boolean;
  openPrEvidenceAvailable: boolean;
  worktreePresent: boolean;
  worktreeClean: boolean;
  sessionAlive: boolean;
  sessionEvidenceComplete: boolean;
  mergedIntoMain: boolean;
  mergedPrVerified: boolean;
  explicitlySuperseded: boolean;
  uniqueCommitsVsMain: number | null;
  ownershipVerified: boolean;
  branchRefsConsistent: boolean;
  registryLifecycleEligible: boolean;
  protectedBranch: boolean;
  duplicateBranchOwnership: boolean;
}

export interface BranchCleanupDecision {
  state: BranchCleanupState;
  destructiveCleanupAllowed: boolean;
  reason: string;
}

function blocked(reason: string): BranchCleanupDecision {
  return {
    state: 'CLEANUP_BLOCKED',
    destructiveCleanupAllowed: false,
    reason,
  };
}

export function classifyBranchCleanup(
  evidence: BranchCleanupEvidence,
): BranchCleanupDecision {
  if (evidence.protectedBranch) {
    return blocked('protected_branch');
  }

  if (evidence.duplicateBranchOwnership) {
    return blocked('duplicate_branch_ownership');
  }

  if (!evidence.ownershipVerified) {
    return blocked('ownership_not_verified');
  }

  if (!evidence.sessionEvidenceComplete) {
    return blocked('session_evidence_missing');
  }

  if (!evidence.openPrEvidenceAvailable) {
    return blocked('open_pr_evidence_unavailable');
  }

  if (evidence.hasOpenPr) {
    return {
      state: 'PR_OPEN',
      destructiveCleanupAllowed: false,
      reason: 'open_pr',
    };
  }

  if (!evidence.registryLifecycleEligible) {
    return blocked('registry_lifecycle_not_terminal');
  }

  if (evidence.sessionAlive) {
    return {
      state: 'ACTIVE',
      destructiveCleanupAllowed: false,
      reason: 'active_session',
    };
  }

  if (evidence.worktreePresent && !evidence.worktreeClean) {
    return blocked('dirty_worktree');
  }

  if (!evidence.branchRefsConsistent) {
    return blocked('local_remote_ref_mismatch');
  }

  // A verified merged PR is durable merge evidence and supports squash merges,
  // where the source commits are intentionally not ancestors of main.
  if (evidence.mergedPrVerified) {
    return {
      state: 'MERGED_PENDING_CLEANUP',
      destructiveCleanupAllowed: true,
      reason: 'verified_merged_pr',
    };
  }

  if (evidence.uniqueCommitsVsMain !== null && evidence.uniqueCommitsVsMain > 0) {
    return {
      state: 'PRESERVE_UNMERGED',
      destructiveCleanupAllowed: false,
      reason: 'unique_commits_not_in_main',
    };
  }

  if (evidence.mergedIntoMain) {
    return {
      state: 'MERGED_PENDING_CLEANUP',
      destructiveCleanupAllowed: true,
      reason: 'fully_merged_into_main',
    };
  }

  if (
    evidence.explicitlySuperseded &&
    evidence.uniqueCommitsVsMain === 0
  ) {
    return {
      state: 'SUPERSEDED_PENDING_CLEANUP',
      destructiveCleanupAllowed: true,
      reason: 'superseded_with_no_unique_commits',
    };
  }

  return blocked('insufficient_cleanup_evidence');
}

export function cleanupStateIsTerminal(state: BranchCleanupState): boolean {
  return state === 'CLEANED';
}

export function cleanupStateRequiresPreservation(state: BranchCleanupState): boolean {
  return (
    state === 'ACTIVE' ||
    state === 'PR_OPEN' ||
    state === 'PRESERVE_UNMERGED' ||
    state === 'CLEANUP_BLOCKED'
  );
}
