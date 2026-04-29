import type {
  OpenClawExecutionContext,
  OpenClawExecutionPolicy,
  OpenClawAgentDefinition,
} from './contracts.js';

const DEFAULT_CONCURRENCY_LIMIT = 1;
const DEFAULT_MAX_BUDGET_USD = 5;

function parseFiniteNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
}

function parsePermissionRecord(permissionData: unknown): Record<string, unknown> {
  if (!permissionData || typeof permissionData !== 'object' || Array.isArray(permissionData)) {
    return {};
  }
  return permissionData as Record<string, unknown>;
}

function parseEnabled(permissionData: Record<string, unknown>): boolean {
  if (typeof permissionData.enabled !== 'boolean') {
    return true;
  }
  return permissionData.enabled;
}

function parseMaxBudgetUsd(permissionData: Record<string, unknown>): number {
  const parsed = parseFiniteNumber(permissionData.max_budget);
  if (parsed === undefined || parsed <= 0) {
    return DEFAULT_MAX_BUDGET_USD;
  }
  return parsed;
}

function parseConcurrencyLimit(permissionData: Record<string, unknown>): number {
  const parsed = parseFiniteNumber(permissionData.concurrency_limit);
  if (parsed === undefined || parsed < 1) {
    return DEFAULT_CONCURRENCY_LIMIT;
  }
  return Math.floor(parsed);
}

/**
 * Evalua la política tenant-aware para un rol sin acoplarse a Supabase.
 * `tenantPermissionsByRole` puede venir desde API/DB o metadata del request.
 */
export function resolveOpenClawExecutionPolicy(
  context: OpenClawExecutionContext
): OpenClawExecutionPolicy {
  const permissionData = parsePermissionRecord(context.tenantPermissionsByRole[context.role]);
  return {
    enabled: parseEnabled(permissionData),
    maxBudgetUsd: parseMaxBudgetUsd(permissionData),
    concurrencyLimit: parseConcurrencyLimit(permissionData),
  };
}

export function evaluateTenantAgentPolicy(input: {
  tenantSlug: string;
  role: OpenClawExecutionContext['role'];
  definition: OpenClawAgentDefinition;
  tenantPermissionsByRole?: Record<string, unknown>;
}): OpenClawExecutionPolicy & { reason?: string } {
  const resolved = resolveOpenClawExecutionPolicy({
    role: input.role,
    tenantPermissionsByRole: input.tenantPermissionsByRole ?? {},
  });
  if (!input.definition.tenantPermissions.allowedPlans.includes('startup')) {
    return {
      ...resolved,
      reason: 'role_restricted_by_default_policy',
    };
  }
  return resolved;
}
