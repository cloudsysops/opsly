import { UNIT_TYPES, type FranchiseUnit, type Franchisee, type UnitType } from './types.js';

export class UnitModelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnitModelError';
  }
}

export function assertValidUnitType(type: string): asserts type is UnitType {
  if (!(UNIT_TYPES as readonly string[]).includes(type)) {
    throw new UnitModelError(`invalid unit type: ${type}`);
  }
}

export function assertFranchiseeDistinctFromUnit(franchisee: Franchisee, unit: FranchiseUnit): void {
  if (franchisee.id === unit.id) {
    throw new UnitModelError('franchisee id must not equal unit id');
  }
  if (franchisee.tenantId !== unit.tenantId) {
    throw new UnitModelError('franchisee and unit tenantId must match');
  }
}

export function assertOwnedUnitHasNoRequiredFranchisee(unit: FranchiseUnit): void {
  if ((unit.type === 'owned' || unit.type === 'flagship' || unit.type === 'mobile') && unit.franchiseeId) {
    return;
  }
  if (unit.type === 'franchise' && !unit.franchiseeId) {
    throw new UnitModelError('franchise units require a franchisee');
  }
}

export function ownedUnitDefaults(input: {
  id: string;
  tenantId: string;
  networkId: string;
  code: string;
  name: string;
  type: Extract<UnitType, 'flagship' | 'owned' | 'mobile'>;
  legacyOperatingId: string | null;
  createdAt: string;
}): FranchiseUnit {
  return {
    id: input.id,
    tenantId: input.tenantId,
    networkId: input.networkId,
    franchiseeId: null,
    code: input.code,
    name: input.name,
    type: input.type,
    status: 'active',
    openingStatus: null,
    primaryLocationId: null,
    territoryId: null,
    agreementId: null,
    legacyOperatingId: input.legacyOperatingId,
    createdAt: input.createdAt,
  };
}
