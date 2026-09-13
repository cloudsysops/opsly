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

  it('maps a provider-backed deposit to a stable payment identity', () => {
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
    expect(plan.receipt).toMatchObject({
      paymentRef: 'payment-1',
      businessDedupeKey: 'deposit:payment:payment-1',
    });
    expect(plan.commissionSignal).toEqual({
      paymentRef: 'payment-1',
      paymentIdentity: 'payment:payment-1',
      depositAmount: 500,
      currency: 'USD',
      requiresExplicitTerms: true,
    });
    expect(plan.reconciliationRequired).toEqual([]);
    expect(plan).not.toHaveProperty('grossValue');
  });

  it('deduplicates the same payment across different delivery event IDs', () => {
    const base = {
      eventType: 'health.deposit.paid' as const,
      tenantSlug: 'health-travel-colombia',
      occurredAt: '2026-09-12T14:00:00.000Z',
      sourceSystem: 'smile-trip-care' as const,
      data: {
        lead_id: 'lead-1',
        provider_id: 'provider-1',
        package_id: 'package-1',
        payment_id: 'payment-1',
        amount_cents: 50000,
        currency: 'USD',
      },
    };

    const first = planHealthTravelRevenueEvent({ ...base, externalEventId: 'event-a' });
    const second = planHealthTravelRevenueEvent({ ...base, externalEventId: 'event-b' });

    expect(first.receipt.externalEventId).not.toBe(second.receipt.externalEventId);
    expect(first.receipt.businessDedupeKey).toBe(second.receipt.businessDedupeKey);
    expect(first.commissionSignal?.paymentIdentity).toBe(
      second.commissionSignal?.paymentIdentity
    );
  });

  it('uses upstream dedupe identity when a deposit has no payment id', () => {
    const plan = planHealthTravelRevenueEvent({
      externalEventId: 'event-4',
      eventType: 'health.deposit.paid',
      tenantSlug: 'health-travel-colombia',
      occurredAt: '2026-09-12T14:00:00.000Z',
      sourceSystem: 'smile-trip-care',
      dedupeKey: 'stripe-session-1',
      data: {
        lead_id: 'lead-1',
        provider_id: 'provider-1',
        amount_cents: 10000,
        currency: 'USD',
      },
    });

    expect(plan.receipt.businessDedupeKey).toBe('deposit:dedupe:stripe-session-1');
    expect(plan.commissionSignal?.paymentIdentity).toBe('dedupe:stripe-session-1');
    expect(plan.reconciliationRequired).not.toContain('payment_identity_missing');
  });

  it('routes deposits without stable payment identity to reconciliation', () => {
    const plan = planHealthTravelRevenueEvent({
      externalEventId: 'event-5',
      eventType: 'health.deposit.paid',
      tenantSlug: 'health-travel-colombia',
      occurredAt: '2026-09-12T14:00:00.000Z',
      sourceSystem: 'smile-trip-care',
      data: {
        lead_id: 'lead-1',
        provider_id: 'provider-1',
        amount_cents: 10000,
        currency: 'USD',
      },
    });

    expect(plan.receipt.businessDedupeKey).toBeNull();
    expect(plan.commissionSignal?.paymentIdentity).toBeNull();
    expect(plan.reconciliationRequired).toContain('payment_identity_missing');
  });

  it('rejects blank lead identity before any ledger key can be derived', () => {
    expect(() =>
      planHealthTravelRevenueEvent({
        externalEventId: 'event-bad-lead',
        eventType: 'health.deposit.paid',
        tenantSlug: 'health-travel-colombia',
        occurredAt: '2026-09-12T14:00:00.000Z',
        sourceSystem: 'smile-trip-care',
        data: {
          lead_id: '   ',
          provider_id: 'provider-1',
          payment_id: 'payment-1',
          amount_cents: 10000,
          currency: 'USD',
        },
      })
    ).toThrow(/data\.lead_id must be non-empty/);
  });

  it('rejects malformed event timestamps before planning persistence', () => {
    expect(() =>
      planHealthTravelRevenueEvent({
        externalEventId: 'event-bad-time',
        eventType: 'health.lead.created',
        tenantSlug: 'health-travel-colombia',
        occurredAt: 'not-a-date',
        sourceSystem: 'smile-trip-care',
        data: { lead_id: 'lead-1' },
      })
    ).toThrow(/occurredAt must be an ISO timestamp/);
  });
});
