import { describe, expect, it } from 'vitest';

import { classifyBranchCleanup } from '../cleanup.js';

const base = {
  hasOpenPr: false,
  openPrEvidenceAvailable: true,
  worktreePresent: true,
  worktreeClean: true,
  sessionAlive: false,
  sessionEvidenceComplete: true,
  mergedIntoMain: false,
  mergedPrVerified: false,
  explicitlySuperseded: false,
  uniqueCommitsVsMain: 0,
  ownershipVerified: true,
  branchRefsConsistent: true,
  registryLifecycleEligible: true,
  protectedBranch: false,
  duplicateBranchOwnership: false,
};

describe('branch cleanup contract', () => {
  it('allows cleanup only after verified merge evidence', () => {
    expect(
      classifyBranchCleanup({
        ...base,
        mergedIntoMain: true,
      }),
    ).toEqual({
      state: 'MERGED_PENDING_CLEANUP',
      destructiveCleanupAllowed: true,
      reason: 'fully_merged_into_main',
    });
  });

  it('accepts a verified merged PR for squash-merge cleanup', () => {
    expect(
      classifyBranchCleanup({
        ...base,
        mergedPrVerified: true,
        uniqueCommitsVsMain: 3,
      }),
    ).toEqual({
      state: 'MERGED_PENDING_CLEANUP',
      destructiveCleanupAllowed: true,
      reason: 'verified_merged_pr',
    });
  });

  it('blocks an open PR even when the branch is otherwise merged', () => {
    expect(
      classifyBranchCleanup({
        ...base,
        hasOpenPr: true,
        mergedIntoMain: true,
      }).state,
    ).toBe('PR_OPEN');
  });

  it('fails closed when open-PR evidence is unavailable', () => {
    expect(
      classifyBranchCleanup({
        ...base,
        openPrEvidenceAvailable: false,
        mergedIntoMain: true,
      }),
    ).toMatchObject({
      state: 'CLEANUP_BLOCKED',
      reason: 'open_pr_evidence_unavailable',
    });
  });

  it('blocks cleanup while the owning runtime session is alive', () => {
    expect(
      classifyBranchCleanup({
        ...base,
        sessionAlive: true,
        mergedIntoMain: true,
      }),
    ).toMatchObject({
      state: 'ACTIVE',
      destructiveCleanupAllowed: false,
    });
  });

  it('fails closed when a referenced session cannot be observed', () => {
    expect(
      classifyBranchCleanup({
        ...base,
        sessionEvidenceComplete: false,
        mergedIntoMain: true,
      }),
    ).toMatchObject({
      state: 'CLEANUP_BLOCKED',
      reason: 'session_evidence_missing',
    });
  });

  it('blocks cleanup of a dirty worktree', () => {
    expect(
      classifyBranchCleanup({
        ...base,
        worktreeClean: false,
        mergedIntoMain: true,
      }),
    ).toMatchObject({
      state: 'CLEANUP_BLOCKED',
      reason: 'dirty_worktree',
    });
  });

  it('preserves a branch with unique commits not in main', () => {
    expect(
      classifyBranchCleanup({
        ...base,
        uniqueCommitsVsMain: 2,
      }),
    ).toMatchObject({
      state: 'PRESERVE_UNMERGED',
      destructiveCleanupAllowed: false,
    });
  });

  it('blocks local/remote branch divergence', () => {
    expect(
      classifyBranchCleanup({
        ...base,
        branchRefsConsistent: false,
        mergedIntoMain: true,
      }),
    ).toMatchObject({
      state: 'CLEANUP_BLOCKED',
      reason: 'local_remote_ref_mismatch',
    });
  });

  it('blocks protected branches unconditionally', () => {
    expect(
      classifyBranchCleanup({
        ...base,
        protectedBranch: true,
        mergedIntoMain: true,
        mergedPrVerified: true,
      }),
    ).toMatchObject({
      state: 'CLEANUP_BLOCKED',
      reason: 'protected_branch',
    });
  });

  it('blocks duplicate registry ownership for the same global branch', () => {
    expect(
      classifyBranchCleanup({
        ...base,
        duplicateBranchOwnership: true,
        mergedIntoMain: true,
      }),
    ).toMatchObject({
      state: 'CLEANUP_BLOCKED',
      reason: 'duplicate_branch_ownership',
    });
  });

  it('blocks active/non-terminal registry lifecycle states', () => {
    expect(
      classifyBranchCleanup({
        ...base,
        registryLifecycleEligible: false,
        mergedIntoMain: true,
      }),
    ).toMatchObject({
      state: 'CLEANUP_BLOCKED',
      reason: 'registry_lifecycle_not_terminal',
    });
  });

  it('allows explicitly superseded cleanup only with zero unique commits', () => {
    expect(
      classifyBranchCleanup({
        ...base,
        explicitlySuperseded: true,
      }),
    ).toMatchObject({
      state: 'SUPERSEDED_PENDING_CLEANUP',
      destructiveCleanupAllowed: true,
    });
  });

  it('fails closed when ownership cannot be verified', () => {
    expect(
      classifyBranchCleanup({
        ...base,
        ownershipVerified: false,
        mergedIntoMain: true,
      }),
    ).toMatchObject({
      state: 'CLEANUP_BLOCKED',
      reason: 'ownership_not_verified',
    });
  });
});
