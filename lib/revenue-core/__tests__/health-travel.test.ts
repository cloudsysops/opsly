import { describe, expect, it } from 'vitest';
import { planHealthTravelRevenueEvent } from '../src/health-travel';

describe('planHealthTravelRevenueEvent', () => {
  it('creates attribution without inventing a provider for a new lead', () => {
    const plan = planHealthTravelRevenueEvent({
      externalEventId: 'event-1',
      eventType: 'health.lead.created',
      tenantSlug: 'health-travel-colombia',
      occurredAt: '2026-09-12T12:00:00.000Z',
      sourceSystem: 'smile-trip-care',
      data: {
        lead_id: 'lead-1',
        source: 'assessment',
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'implants-us',
      },
    });

    expect(plan.attribution).toMatchObject({
      attributionKey: 'health-travel:lead-1',
      source: 'google',
      campaign: 'implants-us',
      channel: 'cpc',
      leadRef: 'lead-1',
    });
    expect(plan.referral).toBeNull();
    expect(plan.reconciliationRequired).toEqual([]);
  });

  it('marks missing provider for downstream commercial stages as reconciliation work', () => {
    const plan = planHealthTravelRevenueEvent({
      externalEventId: 'event-2',
      eventType: 'health.quote.sent',
      tenantSlug: 'health-travel-colombia',
      occurredAt: '2026-09-12T13:00:00.000Z',
      sourceSystem: 'smile-trip-care',
      data: { lead_id: 'lead-1', package_id: 'package-1' },
    });

    expect(plan.referral).toBeNull();
    expect(plan.reconciliationRequired).toEqual([
      'provider_ref_missing',
      'offer_without_provider',
    ]);
  });

  it('maps a provider-backed deposit to converted without treating deposit as gross value', () => {
    const plan = planHealthTravelRevenueEvent({
      externalEventId: 'event-3',
      eventType: 'health.deposit.paid',
      tenantSlug: 'health-travel-colombia',
      occurredAt: '2026-09-12T14:00:00.000Z',
      sourceSystem: 'smile-trip-care',
      dedupeKey: 'stripe:checkout:123',
      data: {
        lead_id: 'lead-1',
        provider_id: 'provider-1',
        package_id: 'package-1',
        payment_id: 'payment-1',
        amount_cents: 50000,
        currency: 'usd',
      },
    });

    expect(plan.referral).toMatchObject({
      providerExternalRef: 'provider-1',
      offerExternalRef: 'package-1',
      status: 'converted',
      convertedAt: '2026-09-12T14:00:00.000Z',
    });
    expect(plan.commissionSignal).toEqual({
      paymentRef: 'payment-1',
      depositAmount: 500,
      currency: 'USD',
      requiresExplicitTerms: true,
    });
    expect(plan).not.toHaveProperty('grossValue');
  });
});
