import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HEALTH_TRAVEL_TENANT_SLUG,
  resolveHealthTravelTenantSlug,
} from '../health-travel-tenant';

describe('Health Travel tenant resolution', () => {
  it('prefers explicit slug, then env, then the non-production sandbox', () => {
    expect(resolveHealthTravelTenantSlug('explicit-demo', { HEALTH_TRAVEL_TENANT_SLUG: 'env-demo' })).toBe(
      'explicit-demo'
    );
    expect(resolveHealthTravelTenantSlug(null, { HEALTH_TRAVEL_TENANT_SLUG: 'env-demo' })).toBe(
      'env-demo'
    );
    expect(resolveHealthTravelTenantSlug(undefined, {})).toBe(
      DEFAULT_HEALTH_TRAVEL_TENANT_SLUG
    );
    expect(DEFAULT_HEALTH_TRAVEL_TENANT_SLUG).toBe('medical-tourism-demo');
  });

  it('ignores blank explicit/env values', () => {
    expect(resolveHealthTravelTenantSlug('   ', { HEALTH_TRAVEL_TENANT_SLUG: '  ' })).toBe(
      'medical-tourism-demo'
    );
  });
});
