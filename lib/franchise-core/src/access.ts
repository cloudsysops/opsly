import type { FranchiseRole } from './types.js';

export type AccessDecision = { allow: boolean; reason: string };

const NETWORK_READ: ReadonlySet<FranchiseRole> = new Set([
  'platform_owner',
  'tenant_owner',
  'franchise_network_admin',
]);

const ROYALTY_READ: ReadonlySet<FranchiseRole> = new Set([
  'platform_owner',
  'tenant_owner',
  'franchise_network_admin',
  'franchise_admin',
]);

const AUDIT_READ: ReadonlySet<FranchiseRole> = new Set([
  'platform_owner',
  'tenant_owner',
  'franchise_network_admin',
  'franchise_admin',
  'auditor',
  'support',
]);

function allow(reason: string): AccessDecision {
  return { allow: true, reason };
}

function deny(reason: string): AccessDecision {
  return { allow: false, reason };
}

export function canReadNetwork(role: FranchiseRole): AccessDecision {
  return NETWORK_READ.has(role) ? allow('network_role') : deny('network_forbidden');
}

export function canReadRoyalties(role: FranchiseRole): AccessDecision {
  if (role === 'teacher') return deny('teacher_cannot_read_royalties');
  return ROYALTY_READ.has(role) ? allow('royalty_role') : deny('royalty_forbidden');
}

export function canReadAudits(role: FranchiseRole): AccessDecision {
  return AUDIT_READ.has(role) ? allow('audit_role') : deny('audit_forbidden');
}

export function canAccessUnit(input: {
  role: FranchiseRole;
  tenantId: string;
  resourceTenantId: string;
  unitId: string;
  assignedUnitIds: readonly string[];
}): AccessDecision {
  if (input.tenantId !== input.resourceTenantId) {
    return deny('tenant_isolation');
  }
  if (
    input.role === 'platform_owner' ||
    input.role === 'tenant_owner' ||
    input.role === 'franchise_network_admin'
  ) {
    return allow('network_scope');
  }
  if (input.assignedUnitIds.includes(input.unitId)) {
    return allow('assigned_unit');
  }
  return deny('unit_isolation');
}

/** Maps tenant staff roles (owner/admin/support/teacher) onto Franchise OS ACL roles. */
export function mapTenantStaffRole(role: string): FranchiseRole {
  switch (role) {
    case 'owner':
      return 'tenant_owner';
    case 'admin':
      return 'franchise_network_admin';
    case 'support':
      return 'support';
    case 'teacher':
      return 'teacher';
    default:
      return 'franchise_staff';
  }
}
