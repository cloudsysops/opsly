import type { RouteContext } from '../router.js';
import { orchestratorModeLabel, parseOrchestratorRole } from '../../orchestrator-role.js';
import { jsonResponse } from '../router.js';

export async function handleHealthCheck(ctx: RouteContext): Promise<void> {
  const role = parseOrchestratorRole();
  const mode = orchestratorModeLabel(role);
  jsonResponse(ctx.res, 200, { status: 'ok', service: 'orchestrator', role, mode });
}
