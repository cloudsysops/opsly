import { describe, expect, it } from 'vitest';
import {
  applyFranchiseScope,
  isFranchiseVisible,
  resolveFranchiseFilter,
} from '../franchise-scope';

const LLANO = '11111111-1111-4111-8111-111111111111';
const DOMI = '22222222-2222-4222-8222-222222222222';
const OTHER = '33333333-3333-4333-8333-333333333333';

describe('resolveFranchiseFilter', () => {
  it('lets a network-wide session read the whole network', () => {
    expect(resolveFranchiseFilter('all', null)).toEqual({ ok: true, franchiseId: null });
  });

  it('lets a network-wide session narrow to one franchise', () => {
    expect(resolveFranchiseFilter('all', LLANO)).toEqual({ ok: true, franchiseId: LLANO });
  });

  it('refuses a session with no franchise membership', () => {
    expect(resolveFranchiseFilter([], null)).toEqual({
      ok: false,
      status: 403,
      reason: 'franchise_forbidden',
    });
    expect(resolveFranchiseFilter([], LLANO)).toEqual({
      ok: false,
      status: 403,
      reason: 'franchise_forbidden',
    });
  });

  it('REFUSES a forged franchise_id outside the session scope', () => {
    expect(resolveFranchiseFilter([LLANO], DOMI)).toEqual({
      ok: false,
      status: 403,
      reason: 'franchise_forbidden',
    });
    expect(resolveFranchiseFilter([LLANO, DOMI], OTHER)).toEqual({
      ok: false,
      status: 403,
      reason: 'franchise_forbidden',
    });
  });

  it('honours an in-scope franchise_id', () => {
    expect(resolveFranchiseFilter([LLANO, DOMI], DOMI)).toEqual({ ok: true, franchiseId: DOMI });
  });

  it('defaults a single-franchise session to its own franchise instead of the network', () => {
    expect(resolveFranchiseFilter([LLANO], null)).toEqual({ ok: true, franchiseId: LLANO });
  });

  it('never widens to the whole network for a multi-franchise scoped session', () => {
    expect(resolveFranchiseFilter([LLANO, DOMI], null)).toEqual({
      ok: false,
      status: 400,
      reason: 'franchise_required',
    });
  });
});

describe('isFranchiseVisible / applyFranchiseScope', () => {
  it('treats a missing franchise_id as invisible to a scoped session', () => {
    expect(isFranchiseVisible([LLANO], null)).toBe(false);
    expect(isFranchiseVisible('all', null)).toBe(true);
  });

  it('filters rows to the scope', () => {
    const rows = [{ franchise_id: LLANO }, { franchise_id: DOMI }, { franchise_id: null }];
    expect(applyFranchiseScope(rows, [LLANO])).toEqual([{ franchise_id: LLANO }]);
    expect(applyFranchiseScope(rows, [])).toEqual([]);
    expect(applyFranchiseScope(rows, 'all')).toEqual(rows);
  });
});
