import { describe, expect, it } from 'vitest';

import { classifyBranchCleanup } from '../cleanup.js';

const base = {
  hasOpenPr: false,
  worktreePresent: true,
  worktreeClean: true,
  sessionAlive: false,
  mergedIntoMain: false,
  explicitlySuperseded: false,
  uniqueCommitsVsMain: 0,
  ownershipVerified: true,
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

  it('blocks an open PR even when the branch is otherwise merged', () => {
    expect(
      classifyBranchCleanup({
        ...base,
        hasOpenPr: true,
        mergedIntoMain: true,
      }).state,
    ).toBe('PR_OPEN');
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
