import { describe, expect, it } from 'vitest';
import {
  healthTravelCatalogSchema,
  healthTravelPackageTypeToOfferType,
  healthTravelProviderTypeToPartnerType,
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
