/**
 * Franchise operating units live under tenant `peskids`.
 * Never create a new Opsly tenant per franchise.
 */

export const PESKIDS_TENANT_SLUG = 'peskids' as const;

export const FRANCHISE_SLUGS = {
  LLANOGRANDE_PRINCIPAL: 'llanogrande-principal',
  DOMICILIOS_PESKIDS: 'domicilios-peskids',
} as const;

export type FranchiseSlug = (typeof FRANCHISE_SLUGS)[keyof typeof FRANCHISE_SLUGS];

export type FranchiseType = 'flagship' | 'owned' | 'franchise' | 'mobile';
export type FranchiseStatus = 'active' | 'paused' | 'archived';
export type FranchiseLocationKind = 'pool' | 'home_zone' | 'office' | 'service_area';

export type SwimModalityOrLocation = 'llanogrande' | 'domicilio' | string | null | undefined;

/** Maps legacy modality/location to franchise slug (compatibility layer). */
export function franchiseSlugFromModality(value: SwimModalityOrLocation): FranchiseSlug {
  if (value === 'domicilio') {
    return FRANCHISE_SLUGS.DOMICILIOS_PESKIDS;
  }
  return FRANCHISE_SLUGS.LLANOGRANDE_PRINCIPAL;
}

export function franchiseLabelFromSlug(slug: string): string {
  switch (slug) {
    case FRANCHISE_SLUGS.LLANOGRANDE_PRINCIPAL:
      return 'Llanogrande Principal';
    case FRANCHISE_SLUGS.DOMICILIOS_PESKIDS:
      return 'Domicilios Peskids';
    default:
      return slug;
  }
}
