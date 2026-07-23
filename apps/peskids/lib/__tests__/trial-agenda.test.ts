import { describe, expect, it } from 'vitest';
import { groupTrialClassesByDate } from '../trial-agenda';

describe('groupTrialClassesByDate', () => {
  it('groups and sorts by scheduled_date', () => {
    const groups = groupTrialClassesByDate([
      { id: 't2', scheduled_date: '2026-07-24' },
      { id: 't1', scheduled_date: '2026-07-23' },
      { id: 't3', scheduled_date: '2026-07-24' },
    ]);

    expect(groups.map((group) => group.date)).toEqual(['2026-07-23', '2026-07-24']);
    expect(groups[1]?.items.map((item) => item.id)).toEqual(['t2', 't3']);
  });
});
