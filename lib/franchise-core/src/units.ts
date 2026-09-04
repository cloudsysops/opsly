import { FRANCHISE_UNIT_TYPES, type FranchiseUnit, type FranchiseUnitType, type Franchisee } from './types.js';

export class UnitModelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnitModelError';
  }
}

export function assertValidUnitType(value: string): asserts value is FranchiseUnitType {
  if (!(FRANCHISE_UNIT_TYPES as readonly string[]).includes(value)) {
    throw new UnitModelError(`invalid unit type: ${value}`);
  }
}

export function assertFranchiseeDistinctFromUnit(franchisee: Franchisee, unit: FranchiseUnit): void {
  if (franchisee.id === unit.id) throw new UnitModelError('franchisee id must not equal unit id');
  if (franchisee.tenantId !== unit.tenantId) {
    throw new UnitModelError('franchisee and unit tenantId must match');
  }
}

export function ownedUnitDefaults(input: {
  id: string;
  tenantId: string;
  networkId?: string;
  code: string;
  name: string;
  type: Extract<FranchiseUnitType, 'flagship' | 'owned' | 'mobile'>;
  legacyOperatingId: string | null;
  createdAt: string;
}): FranchiseUnit {
  return {
    id: input.id,
    tenantId: input.tenantId,
    franchiseeId: null,
    code: input.code,
    name: input.name,
    type: input.type,
    status: 'active',
    openingStatus: 'completed',
    primaryLocationId: null,
    externalSource: input.legacyOperatingId ? 'legacy' : null,
    externalRef: input.legacyOperatingId,
    createdAt: input.createdAt,
  };
}
