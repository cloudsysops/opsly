import { describe, expect, it } from 'vitest';
import { quoteCommission, summarizeCommissionEvents } from '../src/index';

describe('quoteCommission', () => {
  it('quotes flat commission', () => {
    expect(quoteCommission({ model: 'flat', commissionValue: 125 })).toEqual({
      amount: 125,
      reason: 'flat commission',
    });
  });

  it('quotes percentage commission', () => {
    expect(quoteCommission({ model: 'percentage', grossValue: 6400, commissionValue: 8 }))
      .toEqual({ amount: 512, reason: 'percentage commission' });
  });

  it('does not fabricate tiered/manual commissions', () => {
    expect(quoteCommission({ model: 'tiered', grossValue: 1000, commissionValue: 10 }).amount).toBeNull();
  });
});

describe('summarizeCommissionEvents', () => {
  it('separates expected confirmed and paid', () => {
    expect(summarizeCommissionEvents([
      { event_type: 'estimated', amount: 100 },
      { event_type: 'confirmed', amount: 90 },
      { event_type: 'paid', amount: 40 },
    ])).toEqual({ expected: 100, confirmed: 90, paid: 40, receivable: 50 });
  });
});
