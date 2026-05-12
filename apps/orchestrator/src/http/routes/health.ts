import type { IncomingMessage, ServerResponse } from 'node:http';
import { jsonResponse } from '../router.js';
import { verifyPlatformAdminToken } from '../utils.js';

export async function handleHealthCheck(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const { parseOrchestratorRole } = await import('../../orchestrator-role.js');
  const { orchestratorModeLabel } = await import('../../orchestrator-role.js');
  const role = parseOrchestratorRole();
  const mode = orchestratorModeLabel(role);
  return jsonResponse(res, { status: 'ok', service: 'orchestrator', role, mode });
}