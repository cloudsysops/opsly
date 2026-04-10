import type { TenantBudgetCheckResult } from "../billing/budget-enforcer";
import { resumeTenant, suspendTenant } from "../orchestrator";

function baseFields(
  tenantId: string,
  result: TenantBudgetCheckResult,
): Record<string, unknown> {
  return {
    ok: true,
    tenant_id: tenantId,
    currentSpend: result.currentSpend,
    limit: result.limit,
  };
}

/**
 * Ejecuta suspend/resume según resultado de `checkTenantBudget`.
 */
export async function executeBudgetEnforcement(
  tenantId: string,
  result: TenantBudgetCheckResult,
): Promise<Record<string, unknown>> {
  if (result.enforcementSkipped) {
    return {
      ...baseFields(tenantId, result),
      action: "skipped_enforcement",
    };
  }

  if (result.isOverBudget) {
    if (result.tenantStatus === "active") {
      await suspendTenant(tenantId, "budget-enforcer", {
        budgetAutoSuspended: true,
      });
      return { ...baseFields(tenantId, result), action: "suspended" };
    }
    return {
      ...baseFields(tenantId, result),
      action: "already_suspended_or_inactive",
      status: result.tenantStatus,
    };
  }

  if (result.tenantStatus === "suspended" && result.budgetAutoSuspended) {
    await resumeTenant(tenantId);
    return { ...baseFields(tenantId, result), action: "resumed" };
  }

  return {
    ...baseFields(tenantId, result),
    action: "noop",
    status: result.tenantStatus,
  };
}
