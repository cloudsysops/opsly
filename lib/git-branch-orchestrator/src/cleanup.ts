import type { BranchCleanupState } from './types.js';

export interface BranchCleanupEvidence {
  hasOpenPr: boolean;
  worktreePresent: boolean;
  worktreeClean: boolean;
  sessionAlive: boolean;
  mergedIntoMain: boolean;
  explicitlySuperseded: boolean;
  uniqueCommitsVsMain: number | null;
  ownershipVerified: boolean;
}

export interface BranchCleanupDecision {
  state: BranchCleanupState;
  destructiveCleanupAllowed: boolean;
  reason: string;
}

export function classifyBranchCleanup(
  evidence: BranchCleanupEvidence,
): BranchCleanupDecision {
  if (!evidence.ownershipVerified) {
    return {
      state: 'CLEANUP_BLOCKED',
      destructiveCleanupAllowed: false,
      reason: 'ownership_not_verified',
    };
  }

  if (evidence.hasOpenPr) {
    return {
      state: 'PR_OPEN',
      destructiveCleanupAllowed: false,
      reason: 'open_pr',
    };
  }

  if (evidence.sessionAlive) {
    return {
      state: 'ACTIVE',
      destructiveCleanupAllowed: false,
      reason: 'active_session',
    };
  }

  if (evidence.worktreePresent && !evidence.worktreeClean) {
    return {
      state: 'CLEANUP_BLOCKED',
      destructiveCleanupAllowed: false,
      reason: 'dirty_worktree',
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

  return {
    state: 'CLEANUP_BLOCKED',
    destructiveCleanupAllowed: false,
    reason: 'insufficient_cleanup_evidence',
  };
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
