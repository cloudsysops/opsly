import {
  ownedUnitDefaults,
  type FranchiseUnit,
  type UnitType,
} from '@intcloudsysops/franchise-core';
import { FRANCHISE_SLUGS } from '@/lib/franchise-constants';
import type { PeskidsFranchise } from '@/lib/services/franchise.service';

const UNIT_TYPES: ReadonlySet<string> = new Set(['flagship', 'owned', 'franchise', 'mobile']);

function asUnitType(type: string): UnitType {
  return UNIT_TYPES.has(type) ? (type as UnitType) : 'owned';
}

/**
 * Maps 0090 operating rows into Franchise OS units.
 * Owned/flagship/mobile keep franchiseeId null — they are not franchisees.
 */
export function mapOperatingFranchiseToUnit(input: {
  tenantId: string;
  networkId: string;
  franchise: PeskidsFranchise;
}): FranchiseUnit {
  const type = asUnitType(input.franchise.type);
  const defaultsType = type === 'franchise' ? 'owned' : type;
  const unit = ownedUnitDefaults({
    id: input.franchise.id,
    tenantId: input.tenantId,
    networkId: input.networkId,
    code: input.franchise.slug,
    name: input.franchise.name,
    type: defaultsType,
    legacyOperatingId: input.franchise.id,
    createdAt: input.franchise.created_at,
  });
  return type === 'franchise' ? { ...unit, type: 'franchise' } : unit;
}

export function mapPeskidsOperatingNetwork(input: {
  tenantId: string;
  networkId: string;
  franchises: readonly PeskidsFranchise[];
}): FranchiseUnit[] {
  return input.franchises.map((franchise) =>
    mapOperatingFranchiseToUnit({
      tenantId: input.tenantId,
      networkId: input.networkId,
      franchise,
    })
  );
}

export function isSeedOwnedUnit(code: string): boolean {
  return code === FRANCHISE_SLUGS.LLANOGRANDE_PRINCIPAL || code === FRANCHISE_SLUGS.DOMICILIOS_PESKIDS;
}
