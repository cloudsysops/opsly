import { describe, expect, it } from 'vitest';
import {
  nextHealthTravelReferralStatus,
  quoteHealthTravelCommission,
} from '../health-travel-consumer';

describe('Health Travel Revenue consumer policy', () => {
  it('never regresses referral lifecycle on out-of-order events', () => {
    expect(nextHealthTravelReferralStatus('booked', 'qualified')).toBe('booked');
    expect(nextHealthTravelReferralStatus('qualified', 'quoted')).toBe('quoted');
    expect(nextHealthTravelReferralStatus('converted', 'booked')).toBe('converted');
    expect(nextHealthTravelReferralStatus('lost', 'converted')).toBe('lost');
  });

  it('calculates flat commission from explicit offer terms', () => {
    expect(
      quoteHealthTravelCommission({
        offer: {
          id: 'offer-1',
          currency: 'USD',
          commission_model: 'flat',
          commission_value: 125,
          metadata: {},
        },
        depositAmount: 500,
      })
    ).toEqual({
      amount: 125,
      currency: 'USD',
      reconciliationReason: null,
    });
  });

  it('does not use deposit as percentage basis unless offer terms explicitly say so', () => {
    expect(
      quoteHealthTravelCommission({
        offer: {
          id: 'offer-1',
          currency: 'USD',
          commission_model: 'percentage',
          commission_value: 10,
          metadata: {},
        },
        depositAmount: 500,
      })
    ).toEqual({
      amount: null,
      currency: 'USD',
      reconciliationReason: 'percentage_commission_basis_not_explicit',
    });

    expect(
      quoteHealthTravelCommission({
        offer: {
          id: 'offer-1',
          currency: 'USD',
          commission_model: 'percentage',
          commission_value: 10,
          metadata: { commission_basis: 'deposit' },
        },
        depositAmount: 500,
      })
    ).toEqual({
      amount: 50,
      currency: 'USD',
      reconciliationReason: null,
    });
  });

  it('does not calculate manual or tiered commission terms', () => {
    for (const model of ['manual', 'tiered'] as const) {
      expect(
        quoteHealthTravelCommission({
          offer: {
            id: 'offer-1',
            currency: 'USD',
            commission_model: model,
            commission_value: 10,
            metadata: {},
          },
          depositAmount: 500,
        }).reconciliationReason
      ).toBe('commission_terms_require_manual_resolution');
    }
  });
});
