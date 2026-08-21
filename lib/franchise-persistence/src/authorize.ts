import {
  canAccessUnit,
  canReadAgreements,
  canReadAudits,
  canReadOpening,
  canReadRoyalties,
  canWriteFinancial,
  canWriteOpening,
  type FranchiseRole,
} from '@intcloudsysops/franchise-core';
import type { FranchiseActor } from './actor.js';
import { FranchisePersistenceError } from './errors.js';

export function assertTenant(actor: FranchiseActor, resourceTenantId: string): void {
  if (actor.tenantId !== resourceTenantId) {
    throw new FranchisePersistenceError('tenant_isolation', 'Cross-tenant access denied', 403);
  }
}

export function assertUnitScope(actor: FranchiseActor, unitId: string): void {
  const decision = canAccessUnit({
    role: actor.role,
    tenantId: actor.tenantId,
    resourceTenantId: actor.tenantId,
    unitId,
    assignedUnitIds: actor.assignedUnitIds,
  });
  if (!decision.allow) {
    throw new FranchisePersistenceError(decision.reason, decision.reason, 403);
  }
}

export function assertRoyaltyRead(role: FranchiseRole): void {
  const decision = canReadRoyalties(role);
  if (!decision.allow) {
    throw new FranchisePersistenceError(decision.reason, decision.reason, 403);
  }
}

export function assertRoyaltyWrite(role: FranchiseRole): void {
  const decision = canWriteFinancial(role);
  if (!decision.allow) {
    throw new FranchisePersistenceError(decision.reason, decision.reason, 403);
  }
}

export function assertAgreementRead(role: FranchiseRole): void {
  const decision = canReadAgreements(role);
  if (!decision.allow) {
    throw new FranchisePersistenceError(decision.reason, decision.reason, 403);
  }
}

export function assertAuditRead(role: FranchiseRole): void {
  const decision = canReadAudits(role);
  if (!decision.allow) {
    throw new FranchisePersistenceError(decision.reason, decision.reason, 403);
  }
}

export function assertOpeningRead(role: FranchiseRole): void {
  const decision = canReadOpening(role);
  if (!decision.allow) {
    throw new FranchisePersistenceError(decision.reason, decision.reason, 403);
  }
}

export function assertOpeningWrite(role: FranchiseRole): void {
  const decision = canWriteOpening(role);
  if (!decision.allow) {
    throw new FranchisePersistenceError(decision.reason, decision.reason, 403);
  }
}
