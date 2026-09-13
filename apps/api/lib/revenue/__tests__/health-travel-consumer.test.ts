import { describe, expect, it } from 'vitest';
import {
  commissionExternalRef,
  mergeHealthTravelAttributionFacts,
  mergeHealthTravelReferralState,
  nextHealthTravelReferralStatus,
  quoteHealthTravelCommission,
  validateOfferAtEventTime,
} from '../health-travel-consumer';

const activeFlatOffer = {
  id: 'offer-flat',
  currency: 'USD',
  commission_model: 'flat' as const,
  commission_value: 125,
  metadata: {},
  status: 'active',
  valid_from: null,
  valid_until: null,
};

const percentageDepositOffer = {
  id: 'offer-percent',
  currency: 'USD',
  commission_model: 'percentage' as const,
  commission_value: 10,
  metadata: { commission_basis: 'deposit' },
  status: 'active',
  valid_from: null,
  valid_until: null,
};

describe('Health Travel Revenue consumer policy', () => {
  it('never regresses referral lifecycle on out-of-order events', () => {
    expect(nextHealthTravelReferralStatus('booked', 'qualified')).toBe('booked');
    expect(nextHealthTravelReferralStatus('qualified', 'quoted')).toBe('quoted');
    expect(nextHealthTravelReferralStatus('converted', 'booked')).toBe('converted');
    expect(nextHealthTravelReferralStatus('lost', 'converted')).toBe('lost');
    expect(nextHealthTravelReferralStatus('cancelled', 'converted')).toBe('cancelled');
  });

  it('preserves attribution facts and merges event time monotonically', () => {
    expect(
      mergeHealthTravelAttributionFacts(
        {
          first_touch_at: '2026-09-12T12:00:00.000Z',
          last_touch_at: '2026-09-12T14:00:00.000Z',
          campaign: 'known-campaign',
          channel: 'cpc',
        },
        {
          firstTouchAt: '2026-09-12T11:00:00.000Z',
          lastTouchAt: '2026-09-12T13:00:00.000Z',
          campaign: null,
          channel: null,
        }
      )
    ).toEqual({
      first_touch_at: '2026-09-12T11:00:00.000Z',
      last_touch_at: '2026-09-12T14:00:00.000Z',
      campaign: 'known-campaign',
      channel: 'cpc',
    });
  });

  it('retains an existing referral offer when later events omit package id', () => {
    expect(
      mergeHealthTravelReferralState(
        {
          status: 'quoted',
          converted_at: null,
          offer_id: 'offer-existing',
        },
        {
          status: 'booked',
          convertedAt: null,
          offerId: null,
          occurredAt: '2026-09-12T15:00:00.000Z',
        }
      )
    ).toEqual({
      status: 'booked',
      offerId: 'offer-existing',
      convertedAt: null,
    });
  });

  it('keeps terminal referrals terminal when a contradictory deposit arrives', () => {
    expect(
      mergeHealthTravelReferralState(
        {
          status: 'lost',
          converted_at: null,
          offer_id: 'offer-existing',
        },
        {
          status: 'converted',
          convertedAt: '2026-09-12T15:00:00.000Z',
          offerId: null,
          occurredAt: '2026-09-12T15:00:00.000Z',
        }
      ).status
    ).toBe('lost');
  });

  it('calculates flat commission from explicit offer terms', () => {
    expect(
      quoteHealthTravelCommission({
        offer: activeFlatOffer,
        depositAmount: 500,
        depositCurrency: 'COP',
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
          ...percentageDepositOffer,
          metadata: {},
        },
        depositAmount: 500,
        depositCurrency: 'USD',
      })
    ).toEqual({
      amount: null,
      currency: 'USD',
      reconciliationReason: 'percentage_commission_basis_not_explicit',
    });
  });

  it('requires matching currency before percentage-on-deposit calculation', () => {
    expect(
      quoteHealthTravelCommission({
        offer: percentageDepositOffer,
        depositAmount: 500,
        depositCurrency: 'COP',
      })
    ).toEqual({
      amount: null,
      currency: 'USD',
      reconciliationReason: 'percentage_commission_currency_mismatch_or_missing',
    });

    expect(
      quoteHealthTravelCommission({
        offer: percentageDepositOffer,
        depositAmount: 500,
        depositCurrency: 'USD',
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
            ...activeFlatOffer,
            commission_model: model,
            commission_value: 10,
          },
          depositAmount: 500,
          depositCurrency: 'USD',
        }).reconciliationReason
      ).toBe('commission_terms_require_manual_resolution');
    }
  });

  it('uses referral identity for flat commission and payment identity for percentage', () => {
    expect(
      commissionExternalRef({
        offer: activeFlatOffer,
        referralId: 'ref-1',
        paymentIdentity: 'payment:payment-1',
      })
    ).toEqual({
      externalRef: 'health-flat-referral:ref-1',
      reconciliationReason: null,
    });

    expect(
      commissionExternalRef({
        offer: percentageDepositOffer,
        referralId: 'ref-1',
        paymentIdentity: 'payment:payment-1',
      })
    ).toEqual({
      externalRef: 'health-payment:payment:payment-1',
      reconciliationReason: null,
    });
  });

  it('resolves offer terms against event time, not current status alone', () => {
    const historical = {
      ...percentageDepositOffer,
      status: 'paused',
      valid_from: '2026-09-01T00:00:00.000Z',
      valid_until: '2026-09-30T23:59:59.000Z',
    };

    expect(validateOfferAtEventTime(historical, '2026-09-12T12:00:00.000Z')).toBeNull();
    expect(validateOfferAtEventTime(historical, '2026-08-31T23:59:59.000Z')).toBe(
      'offer_terms_not_yet_valid_at_event_time'
    );
    expect(validateOfferAtEventTime(historical, '2026-10-01T00:00:00.000Z')).toBe(
      'offer_terms_expired_at_event_time'
    );
  });

  it('fails closed when inactive offer history has no temporal validity evidence', () => {
    expect(
      validateOfferAtEventTime(
        { ...activeFlatOffer, status: 'paused' },
        '2026-09-12T12:00:00.000Z'
      )
    ).toBe('offer_terms_history_unavailable');

    expect(
      validateOfferAtEventTime(
        { ...activeFlatOffer, valid_from: 'not-a-date' },
        '2026-09-12T12:00:00.000Z'
      )
    ).toBe('offer_terms_validity_invalid');
  });
});
