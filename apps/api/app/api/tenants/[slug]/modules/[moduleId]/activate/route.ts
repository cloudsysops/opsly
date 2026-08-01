import { jsonError, jsonOk, serverErrorLogged } from '../../../../../../../lib/api-response';
import { requireAdminAccess } from '../../../../../../../lib/auth';
import { HTTP_STATUS } from '../../../../../../../lib/constants';
import { evaluateActivationPrecondition } from '../../../../../../../lib/tenant-modules/activation-guard';
import {
  getModuleDefinition,
  isModuleAutomatable,
} from '../../../../../../../lib/tenant-modules/catalog';
import { runModuleProvisioning } from '../../../../../../../lib/tenant-modules/provisioning';
import {
  getMissingDependencies,
  getTenantModuleRow,
  resolveActiveTenantSlug,
  upsertTenantModuleStatus,
} from '../../../../../../../lib/services/tenant-modules.service';
import {
  ModuleIdParamSchema,
  TenantRefParamSchema,
  formatZodError,
} from '../../../../../../../lib/validation';

function conflict(body: Record<string, unknown>): Response {
  return Response.json(body, { status: HTTP_STATUS.CONFLICT });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string; moduleId: string }> }
): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) {
    return authError;
  }

  const { slug, moduleId } = await context.params;
  const slugParsed = TenantRefParamSchema.safeParse(slug);
  if (!slugParsed.success) {
    return jsonError(formatZodError(slugParsed.error), HTTP_STATUS.BAD_REQUEST);
  }
  const moduleParsed = ModuleIdParamSchema.safeParse(moduleId);
  if (!moduleParsed.success) {
    return jsonError(formatZodError(moduleParsed.error), HTTP_STATUS.BAD_REQUEST);
  }

  const mod = getModuleDefinition(moduleParsed.data);
  if (!mod) {
    return jsonError('Unknown module id', HTTP_STATUS.NOT_FOUND);
  }

  if (!isModuleAutomatable(mod)) {
    return conflict({ error: 'Module requires manual setup', automatable: false });
  }

  try {
    const tenantSlug = await resolveActiveTenantSlug(slugParsed.data);
    if (!tenantSlug) {
      return jsonError('Tenant not found', HTTP_STATUS.NOT_FOUND);
    }

    const missing = await getMissingDependencies(tenantSlug, moduleParsed.data);
    if (missing.length > 0) {
      return conflict({ error: 'Missing module dependencies', missing_dependencies: missing });
    }

    // Idempotency: refuse to start a second bootstrap run while one is still
    // plausibly alive; allow re-activation once the row is stale (recovery
    // from a process that died mid-run).
    const current = await getTenantModuleRow(tenantSlug, moduleParsed.data);
    const precondition = evaluateActivationPrecondition(current, mod.estimated_setup_minutes);
    if (!precondition.allowed) {
      return conflict({ error: precondition.message, reason: precondition.reason });
    }

    await upsertTenantModuleStatus(tenantSlug, moduleParsed.data, 'queued');

    // Fire-and-forget — same pattern as provisionTenant() in lib/orchestrator.ts.
    // Errors are handled and persisted inside runModuleProvisioning itself.
    void runModuleProvisioning(tenantSlug, moduleParsed.data);

    return jsonOk({ status: 'queued' }, HTTP_STATUS.ACCEPTED);
  } catch (err) {
    return serverErrorLogged('POST activate tenant module:', err);
  }
}
