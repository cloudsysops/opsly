import { describe, expect, it } from 'vitest';
import { applyFranchiseScope, isFranchiseVisible } from '../franchise-scope';

const LLANO = '11111111-1111-4111-8111-111111111111';
const DOMI = '22222222-2222-4222-8222-222222222222';

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
