import { describe, expect, it } from 'vitest';
import {
  FRANCHISE_SLUGS,
  franchiseSlugFromModality,
  PESKIDS_TENANT_SLUG,
} from '@/lib/franchise-constants';
import {
  assertNoTenantDuplicationForFranchise,
  backfillFranchiseId,
  DEFAULT_FRANCHISE_SEED_SLUGS,
  filterRowsByFranchiseId,
  visibleFranchiseIds,
} from '@/lib/franchise-resolve';

const IDS = {
  [FRANCHISE_SLUGS.LLANOGRANDE_PRINCIPAL]: 'fran-llano',
  [FRANCHISE_SLUGS.DOMICILIOS_PESKIDS]: 'fran-dom',
} as const;

describe('franchise operating model helpers', () => {
  it('maps modality/location to franchise slug', () => {
    expect(franchiseSlugFromModality('domicilio')).toBe(FRANCHISE_SLUGS.DOMICILIOS_PESKIDS);
    expect(franchiseSlugFromModality('llanogrande')).toBe(FRANCHISE_SLUGS.LLANOGRANDE_PRINCIPAL);
    expect(franchiseSlugFromModality(null)).toBe(FRANCHISE_SLUGS.LLANOGRANDE_PRINCIPAL);
  });

  it('backfill is idempotent when franchise_id already set', () => {
    const first = backfillFranchiseId({
      existingFranchiseId: null,
      modality: 'domicilio',
      ids: IDS,
    });
    expect(first).toBe('fran-dom');

    const second = backfillFranchiseId({
      existingFranchiseId: first,
      modality: 'llanogrande',
      ids: IDS,
    });
    expect(second).toBe(first);
  });

  it('filters leads/classes by franchise_id when provided', () => {
    const rows = [
      { id: '1', franchise_id: 'fran-llano' },
      { id: '2', franchise_id: 'fran-dom' },
      { id: '3', franchise_id: null },
    ];
    expect(filterRowsByFranchiseId(rows, null)).toHaveLength(3);
    expect(filterRowsByFranchiseId(rows, 'fran-llano').map((r) => r.id)).toEqual(['1']);
    expect(filterRowsByFranchiseId(rows, 'fran-dom').map((r) => r.id)).toEqual(['2']);
  });

  it('owner/admin see all franchises; teacher is scoped', () => {
    expect(visibleFranchiseIds({ globalRole: 'owner', membershipFranchiseIds: [] })).toBe('all');
    expect(visibleFranchiseIds({ globalRole: 'admin', membershipFranchiseIds: ['x'] })).toBe('all');
    expect(
      visibleFranchiseIds({
        globalRole: 'teacher',
        membershipFranchiseIds: ['fran-llano', 'fran-llano'],
      })
    ).toEqual(['fran-llano']);
  });

  it('does not allow franchise-as-tenant duplication', () => {
    expect(() => assertNoTenantDuplicationForFranchise(PESKIDS_TENANT_SLUG)).not.toThrow();
    expect(() => assertNoTenantDuplicationForFranchise('peskids-rionegro')).toThrow(/peskids/);
  });

  it('seeds exactly the two initial franchise slugs', () => {
    expect(DEFAULT_FRANCHISE_SEED_SLUGS).toEqual([
      FRANCHISE_SLUGS.LLANOGRANDE_PRINCIPAL,
      FRANCHISE_SLUGS.DOMICILIOS_PESKIDS,
    ]);
  });
});
