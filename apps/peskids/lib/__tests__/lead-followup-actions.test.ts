import { describe, expect, it } from 'vitest';
import { dateOneMonthFrom } from '@/lib/admin/lead-followup-actions';

describe('lead follow-up actions', () => {
  it('returns the same day in the next month', () => {
    expect(dateOneMonthFrom(new Date(2026, 8, 6))).toBe('2026-10-06');
  });

  it('clamps month-end dates to the target month', () => {
    expect(dateOneMonthFrom(new Date(2026, 0, 31))).toBe('2026-02-28');
  });
});
