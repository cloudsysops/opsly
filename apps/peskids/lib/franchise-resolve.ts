/**
 * Pure helpers for franchise filtering / backfill semantics (no DB I/O).
 */

import {
  FRANCHISE_SLUGS,
  franchiseSlugFromModality,
  type FranchiseSlug,
  type SwimModalityOrLocation,
} from '@/lib/franchise-constants';

export type FranchiseIdBySlug = Readonly<Record<FranchiseSlug, string>>;

export function resolveFranchiseIdForModality(
  modality: SwimModalityOrLocation,
  ids: FranchiseIdBySlug
): string {
  return ids[franchiseSlugFromModality(modality)];
}

/** Idempotent backfill: keep existing franchise_id; otherwise map modality. */
export function backfillFranchiseId(input: {
  existingFranchiseId: string | null | undefined;
  modality: SwimModalityOrLocation;
  ids: FranchiseIdBySlug;
}): string {
  if (input.existingFranchiseId) {
    return input.existingFranchiseId;
  }
  return resolveFranchiseIdForModality(input.modality, input.ids);
}

export function filterRowsByFranchiseId<T extends { franchise_id?: string | null }>(
  rows: readonly T[],
  franchiseId: string | null | undefined
): T[] {
  if (!franchiseId) {
    return [...rows];
  }
  return rows.filter((row) => row.franchise_id === franchiseId);
}

/** Owner/admin see all franchises; scoped roles only see membership franchise ids. */
export function visibleFranchiseIds(input: {
  globalRole: 'owner' | 'admin' | 'support' | 'teacher' | string;
  membershipFranchiseIds: readonly string[];
}): string[] | 'all' {
  if (input.globalRole === 'owner' || input.globalRole === 'admin') {
    return 'all';
  }
  return [...new Set(input.membershipFranchiseIds)];
}

export function assertNoTenantDuplicationForFranchise(tenantSlug: string): void {
  if (tenantSlug !== 'peskids') {
    throw new Error('Franchise model requires tenant_slug=peskids; do not create per-franchise tenants');
  }
}

export const DEFAULT_FRANCHISE_SEED_SLUGS: readonly FranchiseSlug[] = [
  FRANCHISE_SLUGS.LLANOGRANDE_PRINCIPAL,
  FRANCHISE_SLUGS.DOMICILIOS_PESKIDS,
];
