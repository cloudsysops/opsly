import { tenantRoleFromUserMetadata } from '@/lib/runtime/tenant-identity';
import {
  agreementExpiryAlerts,
  calculateRoyalty,
  canReadRoyalties,
  deriveAgreementStatus,
  findTerritoryConflicts,
  FRANCHISE_EVENTS,
  mapTenantStaffRole,
  summarizeNetwork,
  type FranchiseAgreement,
  type FranchiseRole,
  type RoyaltyCalculation,
  type RoyaltyRule,
  type SalesReport,
  type Territory,
} from '@intcloudsysops/franchise-core';
import { listPeskidsFranchises } from '@/lib/services/franchise.service';
import { mapPeskidsOperatingNetwork } from '@/lib/franchise/map-operating-units';
import type { StaffAuthResult } from '@/lib/staff-auth';

const NETWORK_ID = 'peskids-default';

export function franchiseRoleFromAuth(auth: StaffAuthResult): FranchiseRole {
  if (auth.ok && auth.method === 'secret') return 'tenant_owner';
  if (auth.ok && auth.user) {
    const staff = tenantRoleFromUserMetadata(auth.user) ?? 'support';
    return mapTenantStaffRole(staff);
  }
  return 'franchise_staff';
}

export async function listFranchiseOsUnits(tenantId: string) {
  const franchises = await listPeskidsFranchises({ status: 'active' });
  return mapPeskidsOperatingNetwork({
    tenantId,
    networkId: NETWORK_ID,
    franchises,
  });
}

export function inspectRoyalty(input: {
  id: string;
  unitId: string;
  rule: RoyaltyRule;
  report: SalesReport;
  calculatedAt: string;
}): RoyaltyCalculation {
  return calculateRoyalty(input);
}

export function territoryConflictPayload(territories: Territory[]) {
  return findTerritoryConflicts(territories);
}

export function agreementBoard(agreements: FranchiseAgreement[], nowIso: string) {
  return agreements.map((agreement) => ({
    agreement,
    derivedStatus: deriveAgreementStatus(agreement, nowIso),
    alerts: agreementExpiryAlerts(agreement, nowIso),
  }));
}

export function networkBoard(input: Parameters<typeof summarizeNetwork>[0]) {
  return summarizeNetwork(input);
}

export function canonicalEvents(): string[] {
  return Object.values(FRANCHISE_EVENTS);
}

export function assertRoyaltyAccess(role: FranchiseRole): void {
  const decision = canReadRoyalties(role);
  if (!decision.allow) {
    throw Object.assign(new Error(decision.reason), { status: 403 });
  }
}
