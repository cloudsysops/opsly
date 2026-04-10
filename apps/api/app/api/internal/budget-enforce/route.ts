import { requireAdminToken } from "../../../../lib/auth";
import { checkTenantBudget } from "../../../../lib/billing/budget-enforcer";
import { HTTP_STATUS } from "../../../../lib/constants";
import { executeBudgetEnforcement } from "../../../../lib/internal/budget-enforce-response";
import { parseTenantIdFromJsonBody } from "../../../../lib/internal/parse-tenant-id-body";
import { logger } from "../../../../lib/logger";

/**
 * POST /api/internal/budget-enforce
 *
 * Invocado por el orchestrator (`SuspensionWorker`) con `PLATFORM_ADMIN_TOKEN`.
 * Aplica suspensión por presupuesto o reactivación solo si el tenant quedó
 * suspendido automáticamente por presupuesto (`budget_auto_suspended` en metadata).
 *
 * Reactivación manual ops: usar `POST /api/tenants/:id/resume` (admin).
 */
export async function POST(request: Request): Promise<Response> {
  const auth = requireAdminToken(request);
  if (auth) {
    return auth;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }

  const tenantId = parseTenantIdFromJsonBody(body);
  if (tenantId === null) {
    return Response.json(
      { error: "tenant_id is required" },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }

  try {
    const result = await checkTenantBudget(tenantId);
    const payload = await executeBudgetEnforcement(tenantId, result);
    return Response.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const logArg = err instanceof Error ? err : new Error(message);
    logger.error("internal budget-enforce", logArg);
    return Response.json(
      { error: message },
      { status: HTTP_STATUS.INTERNAL_ERROR },
    );
  }
}
