import type { IntentRequest } from '../types.js';
import { assertAgentRoleContract } from './agent-role-contracts.js';
import type { OpenClawTenantPermission } from './registry.js';
import { assertTenantAwarePermissions } from './tenant-aware-permissions.js';

export interface OpenClawPolicyResult {
  ok: true;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function isCoreAgentRole(
  role: IntentRequest['agent_role']
): role is 'planner' | 'executor' | 'tool' | 'notifier' {
  return role === 'planner' || role === 'executor' || role === 'tool' || role === 'notifier';
}

function readCrossTenantMode(req: IntentRequest): 'read' | 'write' {
  const fromContext = readString(req.context.cross_tenant_mode);
  const fromMetadata = readString(req.metadata?.cross_tenant_mode);
  const mode = fromContext ?? fromMetadata;
  return mode === 'write' ? 'write' : 'read';
}

function hasTenantGovernanceApproval(req: IntentRequest): boolean {
  return req.context.tenant_governance_approved === true || req.metadata?.tenant_governance_approved === true;
}

function readRequestedTargetTenant(req: IntentRequest): string | null {
  const contextTarget = readString(req.context.target_tenant_slug);
  const metadataTarget = readString(req.metadata?.target_tenant_slug);
  return contextTarget ?? metadataTarget;
}

function assertTenantGovernance(
  req: IntentRequest,
  tenantPermissions: readonly OpenClawTenantPermission[]
): void {
  const sourceTenant = readString(req.tenant_slug);
  if (!sourceTenant) {
    // Backward-compatible: legacy requests without tenant slug.
    return;
  }
  const targetTenant = readRequestedTargetTenant(req);
  if (!targetTenant || targetTenant === sourceTenant) {
    return;
  }

  if (!hasTenantGovernanceApproval(req)) {
    throw new Error('tenant governance: cross-tenant access requires explicit approval');
  }

  const mode = readCrossTenantMode(req);
  if (mode === 'write' && !tenantPermissions.includes('cross-tenant-write')) {
    throw new Error('tenant governance: cross-tenant-write permission required');
  }
  if (mode === 'read' && !tenantPermissions.includes('cross-tenant-read')) {
    throw new Error('tenant governance: cross-tenant-read permission required');
  }
}

export function applyOpenClawPolicies(
  req: IntentRequest,
  resolvedIntent: IntentRequest['intent'],
  tenantPermissions: readonly OpenClawTenantPermission[]
): OpenClawPolicyResult {
  assertTenantAwarePermissions(req);
  if (isCoreAgentRole(req.agent_role)) {
    assertAgentRoleContract(req.agent_role, resolvedIntent);
  }
  assertTenantGovernance(req, tenantPermissions);
  return { ok: true };
}
