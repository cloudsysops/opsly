import type { RouteContext } from '../router.js';
import { verifyPlatformAdminToken } from '../utils.js';
import { jsonResponse, errorResponse } from '../router.js';
import {
  getExternalAgentRegistry,
  listExternalAgentsForApi,
} from '../../lib/external-agent-coordinator.js';

export async function handleExternalAgentsRegistry(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }
  try {
    const registry = await getExternalAgentRegistry();
    const agents = await listExternalAgentsForApi();
    jsonResponse(ctx.res, 200, {
      success: true,
      principle: registry.principle,
      default_worker_id: registry.default_worker_id,
      routing_notes: registry.routing_notes,
      agents,
      updated_at: registry.updated_at,
    });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}
