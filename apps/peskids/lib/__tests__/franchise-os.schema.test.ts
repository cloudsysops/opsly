import { describe, expect, it } from 'vitest';
import {
  franchiseAgreementPostSchema,
  franchiseTerritoryPostSchema,
} from '@/lib/validation/franchise-os.schema';

describe('franchise OS POST schemas', () => {
  it('rejects unknown keys on territory create', () => {
    const result = franchiseTerritoryPostSchema.safeParse({
      name: 'QA Territory',
      validFrom: '2026-09-01',
      geometry: { kind: 'municipality', countryCode: 'CO', adminName: 'Rionegro' },
      tenant_slug: 'peskids',
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown keys on agreement create', () => {
    const result = franchiseAgreementPostSchema.safeParse({
      legalName: 'TEST Franchisee',
      unitIds: ['11111111-1111-1111-1111-111111111111'],
      effectiveDate: '2026-09-01',
      expirationDate: '2027-09-01',
      role: 'platform_owner',
    });
    expect(result.success).toBe(false);
  });
});
