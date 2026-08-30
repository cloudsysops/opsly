/**
 * Peskids → Franchise OS unit mapping (adapter, not core).
 *
 * Maps rows of the legacy `platform.peskids_franchises` table into the generic
 * `FranchiseUnit` domain type from @intcloudsysops/franchise-core. All Peskids
 * specifics stay in this adapter — the core never learns about swimming or
 * specific sedes.
 *
 * Pure functions: no DB, no network.
 */

import type {
  FranchiseUnit,
  FranchiseUnitStatus,
  FranchiseUnitType,
} from '@intcloudsysops/franchise-core';

export type PeskidsFranchiseRow = {
  id: string;
  tenant_slug: string;
  slug: string;
  name: string;
  type: 'flagship' | 'owned' | 'franchise' | 'mobile';
  status: 'active' | 'paused' | 'archived';
  is_primary: boolean;
  parent_franchise_id?: string | null;
};

const PESKIDS_UNIT_STATUS_MAP: Record<PeskidsFranchiseRow['status'], FranchiseUnitStatus> = {
  active: 'active',
  paused: 'suspended',
  archived: 'archived',
};

/** Legacy column value → generic unit type (same union, no translation). */
export function peskidsUnitType(type: PeskidsFranchiseRow['type']): FranchiseUnitType {
  return type;
}

/** Peskids operational status → generic unit lifecycle status. */
export function peskidsUnitStatus(status: PeskidsFranchiseRow['status']): FranchiseUnitStatus {
  return PESKIDS_UNIT_STATUS_MAP[status] ?? 'archived';
}

/**
 * Maps a Peskids operating-unit row into the generic unit. `externalRef` is the
 * legacy row id so the generic table can be traced back to
 * `platform.peskids_franchises`.
 */
export function peskidsUnitToFranchiseUnit(
  row: PeskidsFranchiseRow,
  tenantId = row.tenant_slug
): FranchiseUnit {
  return {
    id: `peskids:${row.id}`,
    tenantId,
    franchiseeId: null,
    code: row.slug,
    name: row.name,
    type: peskidsUnitType(row.type),
    status: peskidsUnitStatus(row.status),
    // Active units are operational; anything else has not finished opening.
    openingStatus: row.status === 'active' ? 'completed' : 'not_started',
    primaryLocationId: null,
    externalSource: 'platform.peskids_franchises',
    externalRef: row.id,
    createdAt: new Date().toISOString(),
  };
}

/** Deterministic lookup key for a Peskids unit row inside a tenant. */
export function peskidsUnitKey(tenantSlug: string, code: string): string {
  return `${tenantSlug}:${code}`;
}
