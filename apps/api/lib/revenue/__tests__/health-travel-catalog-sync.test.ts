import { describe, expect, it } from 'vitest';
import {
  assertSmileTripCareCollisionOwned,
  buildHealthTravelOfferPatch,
  healthTravelCatalogSchema,
  healthTravelOfferIdentity,
  healthTravelPackageTypeToOfferType,
  healthTravelProviderTypeToPartnerType,
  isSmileTripCareOwnedMetadata,
  shouldPauseSyncedOffer,
  shouldPauseSyncedProvider,
  SMILE_TRIP_CARE_SOURCE_FILTER,
} from '../health-travel-catalog-sync';

describe('Health Travel catalog sync contract', () => {
  it('maps provider categories without inventing commission policy', () => {
    expect(healthTravelProviderTypeToPartnerType('clinic')).toBe('health_provider');
    expect(healthTravelProviderTypeToPartnerType('specialist')).toBe('health_provider');
    expect(healthTravelProviderTypeToPartnerType('wellness')).toBe('health_provider');
    expect(healthTravelProviderTypeToPartnerType('hotel')).toBe('travel_provider');
    expect(healthTravelProviderTypeToPartnerType('transport')).toBe('travel_provider');
    expect(healthTravelProviderTypeToPartnerType('tour_operator')).toBe('travel_provider');
  });

  it('maps package categories to Revenue Core offer types', () => {
    expect(healthTravelPackageTypeToOfferType('health')).toBe('health');
    expect(healthTravelPackageTypeToOfferType('tour')).toBe('travel');
    expect(healthTravelPackageTypeToOfferType('combo')).toBe('service');
  });

  it('writes public price into the canonical Revenue Core price_amount column', () => {
    const patch = buildHealthTravelOfferPatch(
      {
        id: 'package-1',
        provider_id: 'provider-1',
        name: 'Smile Journey',
        package_type: 'health',
        location: 'Medellin',
        recovery_city: 'Manizales',
        currency: 'USD',
        price_from_usd: 4200,
        published: true,
      },
      { source_system: 'smile-trip-care' }
    );

    expect(patch).toMatchObject({
      name: 'Smile Journey',
      offer_type: 'health',
      currency: 'USD',
      price_amount: 4200,
    });
    expect(patch).not.toHaveProperty('price_from');
    expect(patch).not.toHaveProperty('price_to');
  });

  it('recognizes only explicit SmileTripCare metadata ownership', () => {
    expect(isSmileTripCareOwnedMetadata({ source_system: 'smile-trip-care' })).toBe(true);
    expect(isSmileTripCareOwnedMetadata({ source_system: 'manual' })).toBe(false);
    expect(isSmileTripCareOwnedMetadata({})).toBe(false);
    expect(isSmileTripCareOwnedMetadata(null)).toBe(false);
  });

  it('never treats unrelated metadata as catalog ownership', () => {
    expect(
      isSmileTripCareOwnedMetadata({
        source_system: 'opsly-manual',
        source_provider_type: 'clinic',
        city: 'Medellin',
      })
    ).toBe(false);
  });

  it('fails closed before adopting a provider collision owned by another source', () => {
    expect(() =>
      assertSmileTripCareCollisionOwned({
        entity: 'Partner',
        externalRef: 'provider-1',
        existingId: 'partner-manual',
        metadata: { source_system: 'opsly-manual' },
      })
    ).toThrow('Partner external_ref collision for provider-1');
  });

  it('fails closed before adopting an offer collision owned by another source', () => {
    expect(() =>
      assertSmileTripCareCollisionOwned({
        entity: 'Offer',
        externalRef: 'package-1',
        existingId: 'offer-manual',
        metadata: { source_system: 'opsly-manual' },
      })
    ).toThrow('Offer external_ref collision for package-1');
  });

  it('allows updates only when the colliding row is already SmileTripCare-owned', () => {
    expect(() =>
      assertSmileTripCareCollisionOwned({
        entity: 'Partner',
        externalRef: 'provider-1',
        existingId: 'partner-owned',
        metadata: { source_system: 'smile-trip-care' },
      })
    ).not.toThrow();
    expect(() =>
      assertSmileTripCareCollisionOwned({
        entity: 'Offer',
        externalRef: 'package-1',
        existingId: 'offer-owned',
        metadata: { source_system: 'smile-trip-care' },
      })
    ).not.toThrow();
  });

  it('uses one exact source-owned filter for provider and offer stale reconciliation', () => {
    expect(SMILE_TRIP_CARE_SOURCE_FILTER).toEqual({ source_system: 'smile-trip-care' });
    expect(Object.isFrozen(SMILE_TRIP_CARE_SOURCE_FILTER)).toBe(true);
  });

  it('pauses only stale source-synced providers', () => {
    const active = new Set(['provider-current']);
    expect(
      shouldPauseSyncedProvider({
        externalRef: 'provider-stale',
        status: 'active',
        activeProviderRefs: active,
      })
    ).toBe(true);
    expect(
      shouldPauseSyncedProvider({
        externalRef: 'provider-current',
        status: 'active',
        activeProviderRefs: active,
      })
    ).toBe(false);
    expect(
      shouldPauseSyncedProvider({
        externalRef: 'provider-stale',
        status: 'paused',
        activeProviderRefs: active,
      })
    ).toBe(false);
  });

  it('treats package identity as provider + package so provider moves pause the old mapping', () => {
    const active = new Set([
      healthTravelOfferIdentity('provider-new', 'package-1'),
    ]);

    expect(
      shouldPauseSyncedOffer({
        partnerId: 'provider-old',
        externalRef: 'package-1',
        status: 'active',
        activeOfferKeys: active,
      })
    ).toBe(true);

    expect(
      shouldPauseSyncedOffer({
        partnerId: 'provider-new',
        externalRef: 'package-1',
        status: 'active',
        activeOfferKeys: active,
      })
    ).toBe(false);
  });

  it('rejects leaked contact or internal provider fields', () => {
    const result = healthTravelCatalogSchema.safeParse({
      version: 1,
      source_system: 'smile-trip-care',
      generated_at: '2026-09-12T12:00:00.000Z',
      providers: [
        {
          id: 'p1',
          name: 'Clinic',
          provider_type: 'clinic',
          city: 'Medellin',
          country: 'Colombia',
          approval_status: 'approved',
          published: true,
          contact_email: 'must-not-cross@example.com',
        },
      ],
      offers: [],
    });
    expect(result.success).toBe(false);
  });
});
